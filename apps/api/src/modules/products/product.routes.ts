import { FastifyPluginAsync } from 'fastify';
import {
  createProductSchema,
  updateProductSchema,
  approveProductSchema,
  updateProductStockSchema,
  bulkStockUpdateSchema,
  Permissions,
} from '@hospital-crm/shared';
import {
  listProducts,
  getProductById,
  createProduct,
  updateProduct,
  approveProduct,
  updateProductStock,
  bulkStockUpdate,
  archiveProduct,
  restoreProduct,
  getProductPriceHistory,
  getProductStockHistory,
} from './product.service';
import { previewProductImport, commitProductImport } from './product-import.service';
import { authenticate, requirePermission } from '../auth/auth.middleware';

export const productRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.register(async (authGroup) => {
    authGroup.addHook('preHandler', authenticate);

    // 1. Import Preview (must come before /:id)
    authGroup.post(
      '/products/import/preview',
      { preHandler: [requirePermission(Permissions.PRODUCT_IMPORT, 'product')] },
      async (req, reply) => {
        const body = req.body as any;
        const csvData = body.csv || body.rows || body;
        const result = await previewProductImport(csvData);
        return reply.send(result);
      }
    );

    // 2. Import Commit (must come before /:id)
    authGroup.post(
      '/products/import/commit',
      { preHandler: [requirePermission(Permissions.PRODUCT_IMPORT, 'product')] },
      async (req, reply) => {
        const body = req.body as any;
        const rows = body.rows || body.previewRows || body;
        const result = await commitProductImport(
          rows,
          req.user!,
          req.ip,
          req.headers['user-agent']
        );
        return reply.send(result);
      }
    );

    // 3. List Products
    authGroup.get(
      '/products',
      { preHandler: [requirePermission(Permissions.PRODUCT_VIEW, 'product')] },
      async (req, reply) => {
        const query = req.query as any;
        const params = {
          search: query.search,
          categoryId: query.categoryId ? parseInt(query.categoryId, 10) : undefined,
          stockStatus: query.stockStatus,
          status: query.status,
          prescriptionRequired: query.prescriptionRequired !== undefined ? query.prescriptionRequired === 'true' : undefined,
          minPrice: query.minPrice ? parseFloat(query.minPrice) : undefined,
          maxPrice: query.maxPrice ? parseFloat(query.maxPrice) : undefined,
          campaignId: query.campaignId ? parseInt(query.campaignId, 10) : undefined,
          page: query.page ? parseInt(query.page, 10) : 1,
          pageSize: query.pageSize ? parseInt(query.pageSize, 10) : 20,
          sortBy: query.sortBy,
          sortOrder: query.sortOrder,
        };

        const result = await listProducts(params, req.user!);
        return reply.send(result);
      }
    );

    // 4. Bulk Stock Update (must come before /:id)
    authGroup.post(
      '/products/bulk-stock',
      { preHandler: [requirePermission(Permissions.PRODUCT_STOCK_UPDATE, 'product')] },
      async (req, reply) => {
        const parseResult = bulkStockUpdateSchema.safeParse(req.body);
        if (!parseResult.success) {
          return reply.status(400).send({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid bulk stock payload',
              details: parseResult.error.format(),
            },
          });
        }

        const productIds = parseResult.data.productIds ?? parseResult.data.product_ids!;
        const stockStatus = parseResult.data.stockStatus ?? parseResult.data.stock_status!;
        const note = parseResult.data.note;

        const result = await bulkStockUpdate(
          productIds,
          stockStatus,
          note,
          req.user!,
          req.ip,
          req.headers['user-agent']
        );
        return reply.send(result);
      }
    );

    // 3. Create Product
    authGroup.post(
      '/products',
      { preHandler: [requirePermission(Permissions.PRODUCT_CREATE, 'product')] },
      async (req, reply) => {
        const parseResult = createProductSchema.safeParse(req.body);
        if (!parseResult.success) {
          return reply.status(400).send({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid product payload',
              details: parseResult.error.format(),
            },
          });
        }

        const product = await createProduct(
          parseResult.data,
          req.user!,
          req.ip,
          req.headers['user-agent']
        );
        return reply.status(201).send(product);
      }
    );

    // 4. Get Product Details by ID
    authGroup.get(
      '/products/:id',
      { preHandler: [requirePermission(Permissions.PRODUCT_VIEW, 'product')] },
      async (req, reply) => {
        const { id } = req.params as { id: string };
        const productId = parseInt(id, 10);
        if (isNaN(productId)) {
          return reply.status(400).send({
            error: { code: 'INVALID_ID', message: 'Product ID must be an integer' },
          });
        }

        const product = await getProductById(productId, req.user!);
        return reply.send(product);
      }
    );

    // 5. Update Product
    authGroup.patch(
      '/products/:id',
      { preHandler: [requirePermission(Permissions.PRODUCT_EDIT, 'product')] },
      async (req, reply) => {
        const { id } = req.params as { id: string };
        const productId = parseInt(id, 10);
        if (isNaN(productId)) {
          return reply.status(400).send({
            error: { code: 'INVALID_ID', message: 'Product ID must be an integer' },
          });
        }

        const parseResult = updateProductSchema.safeParse(req.body);
        if (!parseResult.success) {
          return reply.status(400).send({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid product update payload',
              details: parseResult.error.format(),
            },
          });
        }

        const updated = await updateProduct(
          productId,
          parseResult.data,
          req.user!,
          req.ip,
          req.headers['user-agent']
        );
        return reply.send(updated);
      }
    );

    // 6. Approve Product
    authGroup.post(
      '/products/:id/approve',
      { preHandler: [requirePermission(Permissions.PRODUCT_APPROVE, 'product')] },
      async (req, reply) => {
        const { id } = req.params as { id: string };
        const productId = parseInt(id, 10);
        if (isNaN(productId)) {
          return reply.status(400).send({
            error: { code: 'INVALID_ID', message: 'Product ID must be an integer' },
          });
        }

        const parseResult = approveProductSchema.safeParse(req.body);
        if (!parseResult.success) {
          return reply.status(400).send({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid approval payload',
              details: parseResult.error.format(),
            },
          });
        }

        const confirmation =
          parseResult.data.confirmation ??
          parseResult.data.confirmApprovedWording ??
          parseResult.data.confirm_approved_wording ??
          false;

        const approved = await approveProduct(
          productId,
          confirmation,
          req.user!,
          req.ip,
          req.headers['user-agent']
        );
        return reply.send(approved);
      }
    );

    // 7. Stock update for single product
    authGroup.patch(
      '/products/:id/stock',
      { preHandler: [requirePermission(Permissions.PRODUCT_STOCK_UPDATE, 'product')] },
      async (req, reply) => {
        const { id } = req.params as { id: string };
        const productId = parseInt(id, 10);
        if (isNaN(productId)) {
          return reply.status(400).send({
            error: { code: 'INVALID_ID', message: 'Product ID must be an integer' },
          });
        }

        const parseResult = updateProductStockSchema.safeParse(req.body);
        if (!parseResult.success) {
          return reply.status(400).send({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid stock update payload',
              details: parseResult.error.format(),
            },
          });
        }

        const stockStatus = parseResult.data.stockStatus ?? parseResult.data.stock_status!;
        const updated = await updateProductStock(
          productId,
          stockStatus,
          parseResult.data.note,
          req.user!,
          req.ip,
          req.headers['user-agent']
        );
        return reply.send(updated);
      }
    );

    // 8. Archive Product
    authGroup.post(
      '/products/:id/archive',
      { preHandler: [requirePermission(Permissions.PRODUCT_ARCHIVE, 'product')] },
      async (req, reply) => {
        const { id } = req.params as { id: string };
        const productId = parseInt(id, 10);
        if (isNaN(productId)) {
          return reply.status(400).send({
            error: { code: 'INVALID_ID', message: 'Product ID must be an integer' },
          });
        }

        const { force } = (req.body as { force?: boolean }) || {};
        const archived = await archiveProduct(
          productId,
          force === true,
          req.user!,
          req.ip,
          req.headers['user-agent']
        );
        return reply.send(archived);
      }
    );

    // 9. Restore Product
    authGroup.post(
      '/products/:id/restore',
      { preHandler: [requirePermission(Permissions.PRODUCT_ARCHIVE, 'product')] },
      async (req, reply) => {
        const { id } = req.params as { id: string };
        const productId = parseInt(id, 10);
        if (isNaN(productId)) {
          return reply.status(400).send({
            error: { code: 'INVALID_ID', message: 'Product ID must be an integer' },
          });
        }

        const restored = await restoreProduct(
          productId,
          req.user!,
          req.ip,
          req.headers['user-agent']
        );
        return reply.send(restored);
      }
    );

    // 10. Price History
    authGroup.get(
      '/products/:id/price-history',
      { preHandler: [requirePermission(Permissions.PRODUCT_VIEW, 'product')] },
      async (req, reply) => {
        const { id } = req.params as { id: string };
        const productId = parseInt(id, 10);
        if (isNaN(productId)) {
          return reply.status(400).send({
            error: { code: 'INVALID_ID', message: 'Product ID must be an integer' },
          });
        }

        const history = await getProductPriceHistory(productId);
        return reply.send(history);
      }
    );

    // 11. Stock History
    authGroup.get(
      '/products/:id/stock-history',
      { preHandler: [requirePermission(Permissions.PRODUCT_VIEW, 'product')] },
      async (req, reply) => {
        const { id } = req.params as { id: string };
        const productId = parseInt(id, 10);
        if (isNaN(productId)) {
          return reply.status(400).send({
            error: { code: 'INVALID_ID', message: 'Product ID must be an integer' },
          });
        }

        const history = await getProductStockHistory(productId);
        return reply.send(history);
      }
    );
  });
};
