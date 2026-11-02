import { prisma } from '../../database/client';
import { UserContext, hasPermission } from '../rbac/scope';
import { recordAuditLog } from '../audit/audit.service';
import {
  CreateProductInput,
  Permissions,
  ProductStatuses,
  StockStatuses,
} from '@hospital-crm/shared';
import { triggerRestockAlerts, triggerOutOfStockAlerts } from './product-automation.service';

export interface ListProductsParams {
  search?: string;
  categoryId?: number;
  stockStatus?: string;
  status?: string;
  prescriptionRequired?: boolean;
  minPrice?: number;
  maxPrice?: number;
  campaignId?: number;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export async function listProducts(params: ListProductsParams, user: UserContext) {
  const page = Math.max(1, params.page || 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize || 20));
  const skip = (page - 1) * pageSize;

  const canManageCatalog =
    hasPermission(user, Permissions.PRODUCT_CREATE) ||
    hasPermission(user, Permissions.PRODUCT_EDIT) ||
    hasPermission(user, Permissions.PRODUCT_APPROVE);

  const where: any = {};

  // Visibility rule: product_sales_executive and users without catalog manage can only see approved, unarchived
  if (!canManageCatalog) {
    where.status = ProductStatuses.APPROVED;
    where.archivedAt = null;
  } else {
    // If manager, allow status filtering
    if (params.status === 'archived') {
      where.archivedAt = { not: null };
    } else if (params.status) {
      where.status = params.status;
      where.archivedAt = null;
    } else {
      where.archivedAt = null;
    }
  }

  if (params.stockStatus) {
    where.stockStatus = params.stockStatus;
  }

  if (params.prescriptionRequired !== undefined) {
    where.prescriptionRequired = params.prescriptionRequired;
  }

  if (params.minPrice !== undefined || params.maxPrice !== undefined) {
    where.price = {};
    if (params.minPrice !== undefined) where.price.gte = params.minPrice;
    if (params.maxPrice !== undefined) where.price.lte = params.maxPrice;
  }

  if (params.categoryId) {
    // Category filter includes child categories
    const categoryAndChildren = await prisma.productCategory.findMany({
      where: {
        OR: [{ id: params.categoryId }, { parentId: params.categoryId }],
        archivedAt: null,
      },
      select: { id: true },
    });
    const categoryIds = categoryAndChildren.map((c) => c.id);
    where.categoryId = { in: categoryIds };
  }

  if (params.campaignId) {
    where.campaignProducts = {
      some: { campaignId: params.campaignId },
    };
  }

  if (params.search && params.search.trim()) {
    const term = params.search.trim();
    where.OR = [
      { name: { contains: term } },
      { sku: { contains: term.toUpperCase() } },
      { shortDescription: { contains: term } },
      { usageDescription: { contains: term } },
    ];
  }

  const orderByField = params.sortBy || 'updatedAt';
  const orderDir = params.sortOrder || 'desc';
  const orderBy: any = { [orderByField]: orderDir };

  const [total, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      skip,
      take: pageSize,
      orderBy,
      include: {
        category: {
          select: { id: true, name: true, slug: true, parentId: true },
        },
        _count: {
          select: {
            leadInterests: true,
            relationsFrom: { where: { active: true } },
          },
        },
      },
    }),
  ]);

  return {
    products,
    pagination: {
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

export async function getProductById(id: number, user: UserContext) {
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      category: true,
      creator: { select: { id: true, name: true } },
      approver: { select: { id: true, name: true } },
      stockUpdater: { select: { id: true, name: true } },
      relationsFrom: {
        where: { active: true },
        include: {
          relatedProduct: {
            select: {
              id: true,
              sku: true,
              name: true,
              price: true,
              stockStatus: true,
              status: true,
            },
          },
        },
        orderBy: { sort: 'asc' },
      },
      campaignProducts: {
        include: {
          campaign: true,
        },
      },
      _count: {
        select: {
          leadInterests: true,
          waitlistEntries: true,
        },
      },
    },
  });

  if (!product) {
    const error: any = new Error('Product not found');
    error.statusCode = 404;
    throw error;
  }

  const canManageCatalog =
    hasPermission(user, Permissions.PRODUCT_CREATE) ||
    hasPermission(user, Permissions.PRODUCT_EDIT) ||
    hasPermission(user, Permissions.PRODUCT_APPROVE);

  // If not catalog manager and product is draft or archived, forbid
  if (!canManageCatalog && (product.status !== ProductStatuses.APPROVED || product.archivedAt)) {
    const error: any = new Error('Product is not approved or is archived');
    error.statusCode = 403;
    error.code = 'FORBIDDEN';
    throw error;
  }

  // Hide internalNote from sales executives and unauthorized users
  if (!canManageCatalog) {
    product.internalNote = null;
  }

  return product;
}

export async function createProduct(
  input: CreateProductInput,
  user: UserContext,
  ip?: string,
  userAgent?: string
) {
  const sku = input.sku.trim().toUpperCase();

  // 1. SKU uniqueness check
  const existingSku = await prisma.product.findUnique({
    where: { sku },
  });
  if (existingSku) {
    const error: any = new Error(`Product SKU '${sku}' is already in use by '${existingSku.name}'`);
    error.statusCode = 409;
    error.code = 'DUPLICATE_SKU';
    throw error;
  }

  // 2. Category check
  const categoryId = input.categoryId ?? input.category_id!;
  const category = await prisma.productCategory.findUnique({
    where: { id: categoryId },
  });
  if (!category || category.archivedAt) {
    const error: any = new Error('Category not found or archived');
    error.statusCode = 400;
    error.code = 'INVALID_CATEGORY';
    throw error;
  }

  // 3. Short description fallback
  const shortDescription =
    input.shortDescription?.trim() ||
    input.short_description?.trim() ||
    input.usageDescription.substring(0, 160).trim();

  // 4. Initial status determination
  const canApprove = hasPermission(user, Permissions.PRODUCT_APPROVE);
  const isApproved = canApprove && input.approvalConfirmed === true;
  const status = isApproved ? ProductStatuses.APPROVED : ProductStatuses.DRAFT;

  const product = await prisma.$transaction(async (tx) => {
    const created = await tx.product.create({
      data: {
        sku,
        name: input.name.trim(),
        price: input.price,
        usageDescription: input.usageDescription.trim(),
        categoryId,
        shortDescription,
        packSize: input.packSize ?? input.pack_size ?? null,
        howToUse: input.howToUse ?? input.how_to_use ?? null,
        ingredients: input.ingredients ?? null,
        precautions: input.precautions ?? null,
        prescriptionRequired: input.prescriptionRequired ?? input.prescription_required ?? false,
        refillDays: input.refillDays ?? input.refill_days ?? null,
        imageUrl: input.imageUrl ?? input.image_url ?? null,
        internalNote: input.internalNote ?? input.internal_note ?? null,
        status,
        stockStatus: StockStatuses.IN_STOCK,
        stockUpdatedAt: new Date(),
        stockUpdatedById: user.id,
        approvedById: isApproved ? user.id : null,
        approvedAt: isApproved ? new Date() : null,
        createdById: user.id,
      },
    });

    // Write initial stock history
    await tx.productStockHistory.create({
      data: {
        productId: created.id,
        status: StockStatuses.IN_STOCK,
        changedById: user.id,
        note: 'Initial catalog entry',
      },
    });

    return created;
  });

  await recordAuditLog({
    userId: user.id,
    action: 'PRODUCT_CREATED',
    entity: 'product',
    entityId: product.id,
    after: product,
    ip,
    userAgent,
  });

  return product;
}

export async function updateProduct(
  id: number,
  input: any,
  user: UserContext,
  ip?: string,
  userAgent?: string
) {
  const existing = await prisma.product.findUnique({
    where: { id },
  });

  if (!existing || existing.archivedAt) {
    const error: any = new Error('Product not found');
    error.statusCode = 404;
    throw error;
  }

  const data: any = {};

  // 1. SKU Check: cannot be changed after product has been used on a lead
  if (input.sku) {
    const newSku = input.sku.trim().toUpperCase();
    if (newSku !== existing.sku) {
      const usedOnLeadCount = await prisma.leadProductInterest.count({
        where: { productId: id },
      });
      if (usedOnLeadCount > 0) {
        const error: any = new Error('SKU cannot be changed after the product has been added to a lead.');
        error.statusCode = 400;
        error.code = 'SKU_LOCKED';
        throw error;
      }

      // Check uniqueness
      const duplicate = await prisma.product.findUnique({ where: { sku: newSku } });
      if (duplicate && duplicate.id !== id) {
        const error: any = new Error(`Product SKU '${newSku}' is already in use by '${duplicate.name}'`);
        error.statusCode = 409;
        error.code = 'DUPLICATE_SKU';
        throw error;
      }
      data.sku = newSku;
    }
  }

  if (input.name !== undefined) data.name = input.name.trim();

  // 2. Price Change Check: writes to product_price_history
  const hasPriceChange =
    input.price !== undefined && Number(input.price) !== Number(existing.price);

  if (hasPriceChange) {
    data.price = input.price;
  }

  // 3. Category Check
  const categoryId = input.categoryId !== undefined ? input.categoryId : input.category_id;
  if (categoryId !== undefined) {
    const cat = await prisma.productCategory.findUnique({ where: { id: categoryId } });
    if (!cat || cat.archivedAt) {
      const error: any = new Error('Category not found or archived');
      error.statusCode = 400;
      error.code = 'INVALID_CATEGORY';
      throw error;
    }
    data.categoryId = categoryId;
  }

  if (input.shortDescription !== undefined) data.shortDescription = input.shortDescription;
  if (input.short_description !== undefined) data.shortDescription = input.short_description;
  if (input.packSize !== undefined) data.packSize = input.packSize;
  if (input.pack_size !== undefined) data.packSize = input.pack_size;
  if (input.refillDays !== undefined) data.refillDays = input.refillDays;
  if (input.refill_days !== undefined) data.refillDays = input.refill_days;
  if (input.imageUrl !== undefined) data.imageUrl = input.imageUrl;
  if (input.image_url !== undefined) data.imageUrl = input.image_url;
  if (input.internalNote !== undefined) data.internalNote = input.internalNote;
  if (input.internal_note !== undefined) data.internalNote = input.internal_note;

  // 4. Clinical fields check:
  // "Any later edit to usage_description, how_to_use, ingredients, precautions, or prescription_required
  // sets the product back to draft and logs it, unless the editor has product.approve and ticks the same box again."
  const usageDesc = input.usageDescription ?? input.usage_description;
  const howToUse = input.howToUse ?? input.how_to_use;
  const ingredients = input.ingredients;
  const precautions = input.precautions;
  const rxRequired = input.prescriptionRequired ?? input.prescription_required;

  let clinicalFieldsChanged = false;
  if (usageDesc !== undefined && usageDesc.trim() !== existing.usageDescription) {
    data.usageDescription = usageDesc.trim();
    clinicalFieldsChanged = true;
  }
  if (howToUse !== undefined && (howToUse ?? '') !== (existing.howToUse ?? '')) {
    data.howToUse = howToUse;
    clinicalFieldsChanged = true;
  }
  if (ingredients !== undefined && (ingredients ?? '') !== (existing.ingredients ?? '')) {
    data.ingredients = ingredients;
    clinicalFieldsChanged = true;
  }
  if (precautions !== undefined && (precautions ?? '') !== (existing.precautions ?? '')) {
    data.precautions = precautions;
    clinicalFieldsChanged = true;
  }
  if (rxRequired !== undefined && rxRequired !== existing.prescriptionRequired) {
    data.prescriptionRequired = rxRequired;
    clinicalFieldsChanged = true;
  }

  const canApprove = hasPermission(user, Permissions.PRODUCT_APPROVE);
  let statusReverted = false;

  if (existing.status === ProductStatuses.APPROVED && clinicalFieldsChanged) {
    if (canApprove && input.approvalConfirmed === true) {
      // Re-approved with confirmation
      data.status = ProductStatuses.APPROVED;
      data.approvedById = user.id;
      data.approvedAt = new Date();
    } else {
      // Reset back to draft
      data.status = ProductStatuses.DRAFT;
      data.approvedById = null;
      data.approvedAt = null;
      statusReverted = true;
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    const prod = await tx.product.update({
      where: { id },
      data,
    });

    if (hasPriceChange) {
      await tx.productPriceHistory.create({
        data: {
          productId: id,
          oldPrice: existing.price,
          newPrice: input.price,
          changedById: user.id,
          reason: input.priceChangeReason ?? input.price_change_reason ?? null,
        },
      });
    }

    return prod;
  });

  if (statusReverted) {
    await recordAuditLog({
      userId: user.id,
      action: 'PRODUCT_REVERTED_TO_DRAFT',
      entity: 'product',
      entityId: id,
      before: { status: existing.status },
      after: { status: updated.status, reason: 'Clinical details updated without re-approval' },
      ip,
      userAgent,
    });
  }

  if (hasPriceChange) {
    await recordAuditLog({
      userId: user.id,
      action: 'PRODUCT_PRICE_CHANGED',
      entity: 'product',
      entityId: id,
      before: { price: existing.price },
      after: { price: updated.price, reason: input.priceChangeReason ?? input.price_change_reason },
      ip,
      userAgent,
    });
  }

  await recordAuditLog({
    userId: user.id,
    action: 'PRODUCT_UPDATED',
    entity: 'product',
    entityId: id,
    before: existing,
    after: updated,
    ip,
    userAgent,
  });

  return updated;
}

export async function approveProduct(
  id: number,
  confirmation: boolean,
  user: UserContext,
  ip?: string,
  userAgent?: string
) {
  if (!confirmation) {
    const error: any = new Error(
      "Approval requires ticking: 'The description uses only approved wording. It makes no claim to cure, guarantee, or replace a doctor's advice.'"
    );
    error.statusCode = 400;
    error.code = 'APPROVAL_CONFIRMATION_REQUIRED';
    throw error;
  }

  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing || existing.archivedAt) {
    const error: any = new Error('Product not found');
    error.statusCode = 404;
    throw error;
  }

  const updated = await prisma.product.update({
    where: { id },
    data: {
      status: ProductStatuses.APPROVED,
      approvedById: user.id,
      approvedAt: new Date(),
    },
  });

  await recordAuditLog({
    userId: user.id,
    action: 'PRODUCT_APPROVED',
    entity: 'product',
    entityId: id,
    before: { status: existing.status },
    after: { status: updated.status, approvedById: user.id, approvedAt: updated.approvedAt },
    ip,
    userAgent,
  });

  return updated;
}

export async function updateProductStock(
  id: number,
  stockStatus: string,
  note?: string | null,
  user?: UserContext,
  ip?: string,
  userAgent?: string
) {
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing || existing.archivedAt) {
    const error: any = new Error('Product not found');
    error.statusCode = 404;
    throw error;
  }

  const oldStatus = existing.stockStatus;
  if (oldStatus === stockStatus) {
    return existing;
  }

  const updated = await prisma.$transaction(async (tx) => {
    const prod = await tx.product.update({
      where: { id },
      data: {
        stockStatus,
        stockUpdatedAt: new Date(),
        stockUpdatedById: user ? user.id : null,
        stockNote: note ?? null,
      },
    });

    await tx.productStockHistory.create({
      data: {
        productId: id,
        status: stockStatus,
        changedById: user ? user.id : 1,
        note: note ?? null,
      },
    });

    return prod;
  });

  if (user) {
    await recordAuditLog({
      userId: user.id,
      action: 'PRODUCT_STOCK_CHANGED',
      entity: 'product',
      entityId: id,
      before: { stockStatus: oldStatus },
      after: { stockStatus, note },
      ip,
      userAgent,
    });
  }

  // Handle restock alerts and out-of-stock notices
  if (oldStatus === StockStatuses.OUT_OF_STOCK && stockStatus === StockStatuses.IN_STOCK) {
    await triggerRestockAlerts(id);
  } else if (oldStatus === StockStatuses.IN_STOCK && stockStatus === StockStatuses.OUT_OF_STOCK) {
    await triggerOutOfStockAlerts(id);
  }

  return updated;
}

export async function bulkStockUpdate(
  productIds: number[],
  stockStatus: string,
  note?: string | null,
  user?: UserContext,
  ip?: string,
  userAgent?: string
) {
  if (productIds.length === 0) {
    return { count: 0, updatedProducts: [] };
  }

  const products = await prisma.product.findMany({
    where: {
      id: { in: productIds },
      archivedAt: null,
    },
  });

  const updatedProducts = await prisma.$transaction(async (tx) => {
    const results = [];
    const now = new Date();

    for (const prod of products) {
      if (prod.stockStatus !== stockStatus) {
        const u = await tx.product.update({
          where: { id: prod.id },
          data: {
            stockStatus,
            stockUpdatedAt: now,
            stockUpdatedById: user ? user.id : null,
            stockNote: note ?? null,
          },
        });

        await tx.productStockHistory.create({
          data: {
            productId: prod.id,
            status: stockStatus,
            changedById: user ? user.id : 1,
            note: note ?? null,
          },
        });

        results.push(u);
      } else {
        results.push(prod);
      }
    }
    return results;
  });

  if (user) {
    await recordAuditLog({
      userId: user.id,
      action: 'PRODUCT_BULK_STOCK_UPDATED',
      entity: 'product',
      entityId: 0,
      after: {
        productIds,
        stockStatus,
        note,
        count: updatedProducts.length,
      },
      ip,
      userAgent,
    });
  }

  // Trigger alerts for status transitions
  for (const prod of products) {
    if (prod.stockStatus !== stockStatus) {
      if (prod.stockStatus === StockStatuses.OUT_OF_STOCK && stockStatus === StockStatuses.IN_STOCK) {
        await triggerRestockAlerts(prod.id);
      } else if (prod.stockStatus === StockStatuses.IN_STOCK && stockStatus === StockStatuses.OUT_OF_STOCK) {
        await triggerOutOfStockAlerts(prod.id);
      }
    }
  }

  return {
    count: updatedProducts.length,
    updatedProducts,
  };
}

export async function archiveProduct(
  id: number,
  force: boolean = false,
  user?: UserContext,
  ip?: string,
  userAgent?: string
) {
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      relationsTo: {
        where: { active: true },
        include: {
          product: {
            include: {
              relationsFrom: { where: { active: true } },
            },
          },
        },
      },
    },
  });

  if (!product || product.archivedAt) {
    const error: any = new Error('Product not found');
    error.statusCode = 404;
    throw error;
  }

  // Warning check: "A product cannot be archived while it is the only related product of an active curated relation without a warning."
  const soleRelationParents = product.relationsTo.filter((rel) => rel.product.relationsFrom.length === 1);
  if (soleRelationParents.length > 0 && !force) {
    const parentNames = soleRelationParents.map((r) => r.product.name).join(', ');
    const error: any = new Error(
      `This product is the only related product for: ${parentNames}. Archiving will leave them with no curated relations.`
    );
    error.statusCode = 400;
    error.code = 'SOLE_RELATED_PRODUCT_WARNING';
    error.details = {
      soleRelationParents: soleRelationParents.map((r) => ({
        id: r.product.id,
        name: r.product.name,
      })),
      requiresForce: true,
    };
    throw error;
  }

  const archived = await prisma.product.update({
    where: { id },
    data: {
      archivedAt: new Date(),
      status: ProductStatuses.ARCHIVED,
    },
  });

  if (user) {
    await recordAuditLog({
      userId: user.id,
      action: 'PRODUCT_ARCHIVED',
      entity: 'product',
      entityId: id,
      before: product,
      ip,
      userAgent,
    });
  }

  return archived;
}

export async function restoreProduct(
  id: number,
  user: UserContext,
  ip?: string,
  userAgent?: string
) {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product || !product.archivedAt) {
    const error: any = new Error('Archived product not found');
    error.statusCode = 404;
    throw error;
  }

  const restored = await prisma.product.update({
    where: { id },
    data: {
      archivedAt: null,
      status: ProductStatuses.DRAFT, // Restores as draft for safety
    },
  });

  await recordAuditLog({
    userId: user.id,
    action: 'PRODUCT_RESTORED',
    entity: 'product',
    entityId: id,
    before: { status: product.status, archivedAt: product.archivedAt },
    after: { status: restored.status, archivedAt: null },
    ip,
    userAgent,
  });

  return restored;
}

export async function getProductPriceHistory(id: number) {
  const history = await prisma.productPriceHistory.findMany({
    where: { productId: id },
    orderBy: { createdAt: 'desc' },
    include: {
      changedBy: { select: { id: true, name: true, email: true } },
    },
  });
  return history;
}

export async function getProductStockHistory(id: number) {
  const history = await prisma.productStockHistory.findMany({
    where: { productId: id },
    orderBy: { createdAt: 'desc' },
    include: {
      changedBy: { select: { id: true, name: true, email: true } },
    },
  });
  return history;
}
