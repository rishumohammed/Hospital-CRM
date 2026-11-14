import { prisma } from '../../database/client';
import { UserContext } from '../rbac/scope';
import { recordAuditLog } from '../audit/audit.service';
import { CreateProductCategoryInput, UpdateProductCategoryInput } from '@hospital-crm/shared';

function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base && base.length >= 2 ? base : `cat-${Date.now().toString(36)}`;
}

export async function listProductCategories(includeInactive: boolean = false) {
  const where: any = { archivedAt: null };
  if (!includeInactive) {
    where.active = true;
  }

  const categories = await prisma.productCategory.findMany({
    where,
    orderBy: [{ sort: 'asc' }, { name: 'asc' }],
    include: {
      _count: {
        select: {
          products: {
            where: { archivedAt: null },
          },
        },
      },
      children: {
        where,
        orderBy: [{ sort: 'asc' }, { name: 'asc' }],
        include: {
          _count: {
            select: {
              products: {
                where: { archivedAt: null },
              },
            },
          },
        },
      },
    },
  });

  // Filter to root categories for tree view, but also return flat list
  const rootCategories = categories.filter((c) => c.parentId === null);

  return {
    categories,
    tree: rootCategories,
  };
}

export async function createProductCategory(
  input: CreateProductCategoryInput,
  user: UserContext,
  ip?: string,
  userAgent?: string
) {
  const baseSlug = input.slug && input.slug.trim().length >= 2 ? input.slug.trim().toLowerCase() : generateSlug(input.name);

  // Check unique slug; auto-suffix if slug already exists to prevent duplicate collisions
  let slug = baseSlug;
  const existingSlug = await prisma.productCategory.findUnique({ where: { slug } });
  if (existingSlug) {
    let suffix = 1;
    while (await prisma.productCategory.findUnique({ where: { slug: `${baseSlug}-${suffix}` } })) {
      suffix++;
    }
    slug = `${baseSlug}-${suffix}`;
  }

  const parentId = input.parentId ?? input.parent_id ?? null;
  if (parentId) {
    const parent = await prisma.productCategory.findUnique({ where: { id: parentId } });
    if (!parent || parent.archivedAt) {
      const error: any = new Error('Parent category not found');
      error.statusCode = 404;
      error.code = 'PARENT_NOT_FOUND';
      throw error;
    }
    // Enforce 2 levels max (parent cannot have its own parent)
    if (parent.parentId !== null) {
      const error: any = new Error('Categories support at most two levels of hierarchy');
      error.statusCode = 400;
      error.code = 'MAX_DEPTH_EXCEEDED';
      throw error;
    }
  }

  const category = await prisma.productCategory.create({
    data: {
      name: input.name.trim(),
      slug,
      parentId,
      sort: input.sort ?? 0,
      active: input.active ?? true,
      description: input.description ?? null,
    },
  });

  await recordAuditLog({
    userId: user.id,
    action: 'PRODUCT_CATEGORY_CREATED',
    entity: 'product_category',
    entityId: category.id,
    after: category,
    ip,
    userAgent,
  });

  return category;
}

export async function updateProductCategory(
  id: number,
  input: UpdateProductCategoryInput,
  user: UserContext,
  ip?: string,
  userAgent?: string
) {
  const existing = await prisma.productCategory.findUnique({
    where: { id },
  });

  if (!existing || existing.archivedAt) {
    const error: any = new Error('Product category not found');
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }

  const data: any = {};
  if (input.name !== undefined) data.name = input.name.trim();
  if (input.sort !== undefined) data.sort = input.sort;
  if (input.active !== undefined) data.active = input.active;
  if (input.description !== undefined) data.description = input.description;

  if (input.slug !== undefined && input.slug !== null) {
    const slug = input.slug.trim().toLowerCase();
    const slugExists = await prisma.productCategory.findUnique({ where: { slug } });
    if (slugExists && slugExists.id !== id && !slugExists.archivedAt) {
      const error: any = new Error(`Category slug '${slug}' is already taken`);
      error.statusCode = 409;
      error.code = 'DUPLICATE_SLUG';
      throw error;
    }
    data.slug = slug;
  }

  const parentId = input.parentId !== undefined ? input.parentId : input.parent_id;
  if (parentId !== undefined) {
    if (parentId === id) {
      const error: any = new Error('A category cannot be its own parent');
      error.statusCode = 400;
      error.code = 'CIRCULAR_PARENT';
      throw error;
    }
    if (parentId !== null) {
      const parent = await prisma.productCategory.findUnique({ where: { id: parentId } });
      if (!parent || parent.archivedAt) {
        const error: any = new Error('Parent category not found');
        error.statusCode = 404;
        throw error;
      }
      if (parent.parentId !== null) {
        const error: any = new Error('Categories support at most two levels of hierarchy');
        error.statusCode = 400;
        error.code = 'MAX_DEPTH_EXCEEDED';
        throw error;
      }
    }
    data.parentId = parentId;
  }

  const updated = await prisma.productCategory.update({
    where: { id },
    data,
  });

  await recordAuditLog({
    userId: user.id,
    action: 'PRODUCT_CATEGORY_UPDATED',
    entity: 'product_category',
    entityId: id,
    before: existing,
    after: updated,
    ip,
    userAgent,
  });

  return updated;
}

export async function archiveProductCategory(
  id: number,
  user: UserContext,
  ip?: string,
  userAgent?: string
) {
  const category = await prisma.productCategory.findUnique({
    where: { id },
    include: {
      products: { where: { archivedAt: null } },
      children: {
        where: { archivedAt: null },
        include: { products: { where: { archivedAt: null } } },
      },
    },
  });

  if (!category || category.archivedAt) {
    const error: any = new Error('Category not found');
    error.statusCode = 404;
    throw error;
  }

  if (category.slug === 'uncategorized') {
    const error: any = new Error('Uncategorized is a system category and cannot be deleted');
    error.statusCode = 400;
    error.code = 'SYSTEM_CATEGORY_PROTECTED';
    throw error;
  }

  // 1. Enforce requirement: Delete subcategories first before deleting parent category
  if (category.children.length > 0) {
    const error: any = new Error(
      `Cannot delete category '${category.name}' because it contains ${category.children.length} subcategory(s). Please delete all subcategories first.`
    );
    error.statusCode = 400;
    error.code = 'CATEGORY_HAS_SUBCATEGORIES';
    error.details = {
      subcategoriesCount: category.children.length,
      subcategories: category.children.map((c) => ({ id: c.id, name: c.name })),
    };
    throw error;
  }

  // 2. Count active products in this category
  const directCount = category.products.length;
  if (directCount > 0) {
    const error: any = new Error(
      `Cannot delete category '${category.name}' because it contains ${directCount} active product(s). Please move products to another category first.`
    );
    error.statusCode = 400;
    error.code = 'CATEGORY_HAS_ACTIVE_PRODUCTS';
    error.details = {
      productCount: directCount,
      canMove: true,
    };
    throw error;
  }

  const archived = await prisma.productCategory.update({
    where: { id },
    data: {
      archivedAt: new Date(),
      active: false,
    },
  });

  await recordAuditLog({
    userId: user.id,
    action: 'PRODUCT_CATEGORY_DELETED',
    entity: 'product_category',
    entityId: id,
    before: category,
    ip,
    userAgent,
  });

  return archived;
}

export const deleteProductCategory = archiveProductCategory;

export async function moveCategoryProducts(
  fromCategoryId: number,
  targetCategoryId: number,
  user: UserContext,
  ip?: string,
  userAgent?: string
) {
  if (fromCategoryId === targetCategoryId) {
    const error: any = new Error('Source and target categories must be different');
    error.statusCode = 400;
    error.code = 'SAME_CATEGORY';
    throw error;
  }

  const [fromCategory, targetCategory] = await Promise.all([
    prisma.productCategory.findUnique({ where: { id: fromCategoryId } }),
    prisma.productCategory.findUnique({ where: { id: targetCategoryId } }),
  ]);

  if (!fromCategory || fromCategory.archivedAt) {
    const error: any = new Error('Source category not found');
    error.statusCode = 404;
    throw error;
  }

  if (!targetCategory || targetCategory.archivedAt) {
    const error: any = new Error('Target category not found');
    error.statusCode = 404;
    throw error;
  }

  const result = await prisma.product.updateMany({
    where: {
      categoryId: fromCategoryId,
      archivedAt: null,
    },
    data: {
      categoryId: targetCategoryId,
    },
  });

  await recordAuditLog({
    userId: user.id,
    action: 'PRODUCT_CATEGORY_PRODUCTS_MOVED',
    entity: 'product_category',
    entityId: fromCategoryId,
    after: {
      fromCategoryId,
      targetCategoryId,
      movedCount: result.count,
    },
    ip,
    userAgent,
  });

  return {
    success: true,
    movedCount: result.count,
    fromCategory: fromCategory.name,
    targetCategory: targetCategory.name,
  };
}
