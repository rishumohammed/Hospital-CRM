import { prisma } from '../../database/client';
import { UserContext, hasPermission } from '../rbac/scope';
import { recordAuditLog } from '../audit/audit.service';
import {
  CreateProductRelationInput,
  UpdateProductRelationInput,
  Permissions,
  ProductStatuses,
  StockStatuses,
} from '@hospital-crm/shared';

export async function getProductRelations(productId: number, user: UserContext) {
  const canManage = hasPermission(user, Permissions.PRODUCT_RELATION_MANAGE);

  const where: any = {
    productId,
    archivedAt: null,
  };

  if (!canManage) {
    where.active = true;
    where.relatedProduct = {
      status: ProductStatuses.APPROVED,
      archivedAt: null,
    };
  }

  const relations = await prisma.productRelation.findMany({
    where,
    orderBy: { sort: 'asc' },
    include: {
      relatedProduct: {
        select: {
          id: true,
          sku: true,
          name: true,
          price: true,
          shortDescription: true,
          usageDescription: true,
          packSize: true,
          stockStatus: true,
          status: true,
          prescriptionRequired: true,
          categoryId: true,
        },
      },
    },
  });

  return relations;
}

export async function createProductRelation(
  productId: number,
  input: CreateProductRelationInput,
  user: UserContext,
  ip?: string,
  userAgent?: string
) {
  const relatedProductId = input.relatedProductId ?? input.related_product_id!;
  const relationType = input.relationType ?? input.relation_type!;
  const talkingPoint = (input.talkingPoint ?? input.talking_point!).trim();

  // 1. Cannot relate to itself
  if (productId === relatedProductId) {
    const error: any = new Error('A product cannot relate to itself');
    error.statusCode = 400;
    error.code = 'SELF_RELATION_FORBIDDEN';
    throw error;
  }

  // 2. Both products must exist and not be archived
  const [sourceProd, targetProd] = await Promise.all([
    prisma.product.findUnique({ where: { id: productId } }),
    prisma.product.findUnique({ where: { id: relatedProductId } }),
  ]);

  if (!sourceProd || sourceProd.archivedAt) {
    const error: any = new Error('Source product not found');
    error.statusCode = 404;
    error.code = 'SOURCE_PRODUCT_NOT_FOUND';
    throw error;
  }

  if (!targetProd || targetProd.archivedAt) {
    const error: any = new Error('Related product not found');
    error.statusCode = 404;
    error.code = 'RELATED_PRODUCT_NOT_FOUND';
    throw error;
  }

  // 3. Duplicate check (same pair and relation type)
  const existing = await prisma.productRelation.findUnique({
    where: {
      productId_relatedProductId_relationType: {
        productId,
        relatedProductId,
        relationType,
      },
    },
  });

  if (existing && !existing.archivedAt) {
    const error: any = new Error(
      `A '${relationType}' relation between '${sourceProd.name}' and '${targetProd.name}' already exists`
    );
    error.statusCode = 409;
    error.code = 'DUPLICATE_RELATION';
    throw error;
  }

  const relation = await prisma.productRelation.upsert({
    where: {
      productId_relatedProductId_relationType: {
        productId,
        relatedProductId,
        relationType,
      },
    },
    create: {
      productId,
      relatedProductId,
      relationType,
      talkingPoint,
      sort: input.sort ?? 0,
      active: input.active ?? true,
    },
    update: {
      talkingPoint,
      sort: input.sort ?? 0,
      active: input.active ?? true,
      archivedAt: null,
    },
    include: {
      relatedProduct: true,
    },
  });

  // Mirror reverse relation if requested
  if (input.mirror) {
    await prisma.productRelation.upsert({
      where: {
        productId_relatedProductId_relationType: {
          productId: relatedProductId,
          relatedProductId: productId,
          relationType,
        },
      },
      create: {
        productId: relatedProductId,
        relatedProductId: productId,
        relationType,
        talkingPoint,
        sort: input.sort ?? 0,
        active: input.active ?? true,
      },
      update: {
        talkingPoint,
        sort: input.sort ?? 0,
        active: input.active ?? true,
        archivedAt: null,
      },
    });
  }

  await recordAuditLog({
    userId: user.id,
    action: 'PRODUCT_RELATION_CREATED',
    entity: 'product_relation',
    entityId: relation.id,
    after: {
      ...relation,
      mirrored: !!input.mirror,
    },
    ip,
    userAgent,
  });

  return relation;
}

export async function updateProductRelation(
  id: number,
  input: UpdateProductRelationInput,
  user: UserContext,
  ip?: string,
  userAgent?: string
) {
  const existing = await prisma.productRelation.findUnique({
    where: { id },
  });

  if (!existing || existing.archivedAt) {
    const error: any = new Error('Product relation not found');
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }

  const data: any = {};
  if (input.relationType || input.relation_type) {
    data.relationType = input.relationType ?? input.relation_type;
  }
  if (input.talkingPoint !== undefined || input.talking_point !== undefined) {
    data.talkingPoint = (input.talkingPoint ?? input.talking_point)?.trim();
  }
  if (input.sort !== undefined) {
    data.sort = input.sort;
  }
  if (input.active !== undefined) {
    data.active = input.active;
  }

  const updated = await prisma.productRelation.update({
    where: { id },
    data,
    include: { relatedProduct: true },
  });

  await recordAuditLog({
    userId: user.id,
    action: 'PRODUCT_RELATION_UPDATED',
    entity: 'product_relation',
    entityId: id,
    before: existing,
    after: updated,
    ip,
    userAgent,
  });

  return updated;
}

export async function archiveProductRelation(
  id: number,
  user: UserContext,
  ip?: string,
  userAgent?: string
) {
  const existing = await prisma.productRelation.findUnique({
    where: { id },
  });

  if (!existing || existing.archivedAt) {
    const error: any = new Error('Product relation not found');
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }

  const archived = await prisma.productRelation.update({
    where: { id },
    data: {
      archivedAt: new Date(),
      active: false,
    },
  });

  await recordAuditLog({
    userId: user.id,
    action: 'PRODUCT_RELATION_ARCHIVED',
    entity: 'product_relation',
    entityId: id,
    before: existing,
    ip,
    userAgent,
  });

  return archived;
}

export interface SuggestionItem {
  id: number;
  sku: string;
  name: string;
  price: string | number;
  shortDescription: string | null;
  usageDescription: string;
  packSize: string | null;
  stockStatus: string;
  prescriptionRequired: boolean;
  relationType: string | null;
  talkingPoint: string | null;
  reason: 'curated' | 'alternative' | 'popular_in_category';
  label?: string;
}

export async function getProductSuggestions(
  productId: number,
  leadId?: number
): Promise<SuggestionItem[]> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      category: true,
    },
  });

  if (!product || product.archivedAt || product.status !== ProductStatuses.APPROVED) {
    const error: any = new Error('Product not found or not approved');
    error.statusCode = 404;
    throw error;
  }

  // Find products already on this lead to exclude
  const excludedProductIds = new Set<number>([productId]);

  if (leadId) {
    const leadInterests = await prisma.leadProductInterest.findMany({
      where: { leadId },
      select: { productId: true },
    });
    leadInterests.forEach((li) => excludedProductIds.add(li.productId));
  }

  // Fetch all active curated relations from this product
  const relations = await prisma.productRelation.findMany({
    where: {
      productId,
      active: true,
      archivedAt: null,
      relatedProduct: {
        status: ProductStatuses.APPROVED,
        archivedAt: null,
      },
    },
    orderBy: { sort: 'asc' },
    include: {
      relatedProduct: true,
    },
  });

  const isOutOfStock = product.stockStatus === StockStatuses.OUT_OF_STOCK;

  const suggestions: SuggestionItem[] = [];
  const addedProductIds = new Set<number>();

  function addSuggestion(
    p: any,
    reason: 'curated' | 'alternative' | 'popular_in_category',
    relationType: string | null = null,
    talkingPoint: string | null = null,
    label?: string
  ) {
    if (excludedProductIds.has(p.id) || addedProductIds.has(p.id)) {
      return false;
    }
    addedProductIds.add(p.id);
    suggestions.push({
      id: p.id,
      sku: p.sku,
      name: p.name,
      price: p.price,
      shortDescription: p.shortDescription,
      usageDescription: p.usageDescription,
      packSize: p.packSize,
      stockStatus: p.stockStatus,
      prescriptionRequired: p.prescriptionRequired,
      relationType,
      talkingPoint,
      reason,
      label,
    });
    return true;
  }

  // 1. If selected product is OUT OF STOCK:
  // "curated substitute relations that are in stock, shown first and labeled 'Alternative'"
  if (isOutOfStock) {
    const inStockSubstitutes = relations.filter(
      (r) =>
        r.relationType === 'substitute' &&
        r.relatedProduct.stockStatus === StockStatuses.IN_STOCK
    );
    for (const rel of inStockSubstitutes) {
      if (suggestions.length >= 6) break;
      addSuggestion(
        rel.relatedProduct,
        'alternative',
        rel.relationType,
        rel.talkingPoint,
        'Alternative'
      );
    }
  }

  // 2. Curated cross_sell, upsell, and frequently_together relations that are in stock, by sort
  const inStockCurated = relations.filter(
    (r) =>
      ['cross_sell', 'upsell', 'frequently_together'].includes(r.relationType) &&
      r.relatedProduct.stockStatus === StockStatuses.IN_STOCK
  );
  for (const rel of inStockCurated) {
    if (suggestions.length >= 6) break;
    addSuggestion(
      rel.relatedProduct,
      'curated',
      rel.relationType,
      rel.talkingPoint
    );
  }

  // 3. Same-category in-stock products ranked by how often they were accepted on product leads in last 90 days
  if (suggestions.length < 6) {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const acceptedByCategory = await prisma.leadProductInterest.groupBy({
      by: ['productId'],
      where: {
        status: 'accepted',
        createdAt: { gte: ninetyDaysAgo },
        product: {
          categoryId: product.categoryId,
          status: ProductStatuses.APPROVED,
          stockStatus: StockStatuses.IN_STOCK,
          archivedAt: null,
          id: { notIn: Array.from(excludedProductIds) },
        },
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: 6,
    });

    const popularProductIds = acceptedByCategory.map((a) => a.productId);

    if (popularProductIds.length > 0) {
      const popularProducts = await prisma.product.findMany({
        where: { id: { in: popularProductIds } },
      });
      // Maintain ranking order from groupBy
      const popularMap = new Map(popularProducts.map((p) => [p.id, p]));
      for (const popId of popularProductIds) {
        if (suggestions.length >= 6) break;
        const p = popularMap.get(popId);
        if (p) {
          addSuggestion(p, 'popular_in_category', null, null, 'Popular in category');
        }
      }
    }

    // Fallback in same category if still under 6
    if (suggestions.length < 6) {
      const remainingCategoryProds = await prisma.product.findMany({
        where: {
          categoryId: product.categoryId,
          status: ProductStatuses.APPROVED,
          stockStatus: StockStatuses.IN_STOCK,
          archivedAt: null,
          id: {
            notIn: [
              ...Array.from(excludedProductIds),
              ...Array.from(addedProductIds),
            ],
          },
        },
        take: 6 - suggestions.length,
        orderBy: { updatedAt: 'desc' },
      });

      for (const p of remainingCategoryProds) {
        if (suggestions.length >= 6) break;
        addSuggestion(p, 'popular_in_category', null, null, 'Category product');
      }
    }
  }

  // 4. Curated relations that are out of stock, shown last and greyed, labeled "Out of stock"
  if (suggestions.length < 6) {
    const outOfStockCurated = relations.filter(
      (r) => r.relatedProduct.stockStatus === StockStatuses.OUT_OF_STOCK
    );
    for (const rel of outOfStockCurated) {
      if (suggestions.length >= 6) break;
      const isSub = rel.relationType === 'substitute';
      addSuggestion(
        rel.relatedProduct,
        isSub ? 'alternative' : 'curated',
        rel.relationType,
        rel.talkingPoint,
        'Out of stock'
      );
    }
  }

  return suggestions.slice(0, 6);
}
