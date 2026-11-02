import { FastifyPluginAsync } from 'fastify';
import {
  createProductCategorySchema,
  updateProductCategorySchema,
  moveCategoryProductsSchema,
  Permissions,
} from '@hospital-crm/shared';
import {
  listProductCategories,
  createProductCategory,
  updateProductCategory,
  archiveProductCategory,
  moveCategoryProducts,
} from './product-category.service';
import { authenticate, requirePermission } from '../auth/auth.middleware';

export const productCategoryRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.register(async (authGroup) => {
    authGroup.addHook('preHandler', authenticate);

    // 1. List Categories
    authGroup.get(
      '/product-categories',
      { preHandler: [requirePermission(Permissions.PRODUCT_VIEW, 'product_category')] },
      async (req, reply) => {
        const { includeInactive } = req.query as { includeInactive?: string };
        const result = await listProductCategories(includeInactive === 'true');
        return reply.send(result);
      }
    );

    // 2. Create Category
    authGroup.post(
      '/product-categories',
      { preHandler: [requirePermission(Permissions.PRODUCT_CATEGORY_MANAGE, 'product_category')] },
      async (req, reply) => {
        const parseResult = createProductCategorySchema.safeParse(req.body);
        if (!parseResult.success) {
          return reply.status(400).send({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid product category payload',
              details: parseResult.error.format(),
            },
          });
        }

        const category = await createProductCategory(
          parseResult.data,
          req.user!,
          req.ip,
          req.headers['user-agent']
        );
        return reply.status(201).send(category);
      }
    );

    // 3. Update Category
    authGroup.patch(
      '/product-categories/:id',
      { preHandler: [requirePermission(Permissions.PRODUCT_CATEGORY_MANAGE, 'product_category')] },
      async (req, reply) => {
        const { id } = req.params as { id: string };
        const categoryId = parseInt(id, 10);
        if (isNaN(categoryId)) {
          return reply.status(400).send({
            error: { code: 'INVALID_ID', message: 'Category ID must be an integer' },
          });
        }

        const parseResult = updateProductCategorySchema.safeParse(req.body);
        if (!parseResult.success) {
          return reply.status(400).send({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid product category update payload',
              details: parseResult.error.format(),
            },
          });
        }

        const updated = await updateProductCategory(
          categoryId,
          parseResult.data,
          req.user!,
          req.ip,
          req.headers['user-agent']
        );
        return reply.send(updated);
      }
    );

    // 4. Archive Category
    authGroup.post(
      '/product-categories/:id/archive',
      { preHandler: [requirePermission(Permissions.PRODUCT_CATEGORY_MANAGE, 'product_category')] },
      async (req, reply) => {
        const { id } = req.params as { id: string };
        const categoryId = parseInt(id, 10);
        if (isNaN(categoryId)) {
          return reply.status(400).send({
            error: { code: 'INVALID_ID', message: 'Category ID must be an integer' },
          });
        }

        const archived = await archiveProductCategory(
          categoryId,
          req.user!,
          req.ip,
          req.headers['user-agent']
        );
        return reply.send(archived);
      }
    );

    // 5. Move Products between Categories
    authGroup.post(
      '/product-categories/:id/move-products',
      { preHandler: [requirePermission(Permissions.PRODUCT_CATEGORY_MANAGE, 'product_category')] },
      async (req, reply) => {
        const { id } = req.params as { id: string };
        const fromCategoryId = parseInt(id, 10);
        if (isNaN(fromCategoryId)) {
          return reply.status(400).send({
            error: { code: 'INVALID_ID', message: 'Source Category ID must be an integer' },
          });
        }

        const parseResult = moveCategoryProductsSchema.safeParse(req.body);
        if (!parseResult.success) {
          return reply.status(400).send({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid move category products payload',
              details: parseResult.error.format(),
            },
          });
        }

        const targetCategoryId =
          parseResult.data.targetCategoryId ?? parseResult.data.target_category_id!;
        const result = await moveCategoryProducts(
          fromCategoryId,
          targetCategoryId,
          req.user!,
          req.ip,
          req.headers['user-agent']
        );
        return reply.send(result);
      }
    );
  });
};
