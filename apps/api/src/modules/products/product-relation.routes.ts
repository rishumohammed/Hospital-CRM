import { FastifyPluginAsync } from 'fastify';
import {
  createProductRelationSchema,
  updateProductRelationSchema,
  Permissions,
} from '@hospital-crm/shared';
import {
  getProductRelations,
  createProductRelation,
  updateProductRelation,
  archiveProductRelation,
  getProductSuggestions,
} from './product-relation.service';
import { authenticate, requirePermission } from '../auth/auth.middleware';

export const productRelationRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.register(async (authGroup) => {
    authGroup.addHook('preHandler', authenticate);

    // 1. Get Curated Relations for a Product
    authGroup.get(
      '/products/:id/relations',
      { preHandler: [requirePermission(Permissions.PRODUCT_VIEW, 'product')] },
      async (req, reply) => {
        const { id } = req.params as { id: string };
        const productId = parseInt(id, 10);
        if (isNaN(productId)) {
          return reply.status(400).send({
            error: { code: 'INVALID_ID', message: 'Product ID must be an integer' },
          });
        }

        const relations = await getProductRelations(productId, req.user!);
        return reply.send(relations);
      }
    );

    // 2. Add Curated Relation for a Product
    authGroup.post(
      '/products/:id/relations',
      { preHandler: [requirePermission(Permissions.PRODUCT_RELATION_MANAGE, 'product_relation')] },
      async (req, reply) => {
        const { id } = req.params as { id: string };
        const productId = parseInt(id, 10);
        if (isNaN(productId)) {
          return reply.status(400).send({
            error: { code: 'INVALID_ID', message: 'Product ID must be an integer' },
          });
        }

        const parseResult = createProductRelationSchema.safeParse(req.body);
        if (!parseResult.success) {
          return reply.status(400).send({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid product relation payload',
              details: parseResult.error.format(),
            },
          });
        }

        const relation = await createProductRelation(
          productId,
          parseResult.data,
          req.user!,
          req.ip,
          req.headers['user-agent']
        );
        return reply.status(201).send(relation);
      }
    );

    // 3. Update Product Relation
    authGroup.patch(
      '/product-relations/:id',
      { preHandler: [requirePermission(Permissions.PRODUCT_RELATION_MANAGE, 'product_relation')] },
      async (req, reply) => {
        const { id } = req.params as { id: string };
        const relationId = parseInt(id, 10);
        if (isNaN(relationId)) {
          return reply.status(400).send({
            error: { code: 'INVALID_ID', message: 'Relation ID must be an integer' },
          });
        }

        const parseResult = updateProductRelationSchema.safeParse(req.body);
        if (!parseResult.success) {
          return reply.status(400).send({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid product relation update payload',
              details: parseResult.error.format(),
            },
          });
        }

        const updated = await updateProductRelation(
          relationId,
          parseResult.data,
          req.user!,
          req.ip,
          req.headers['user-agent']
        );
        return reply.send(updated);
      }
    );

    // 4. Archive Product Relation
    authGroup.post(
      '/product-relations/:id/archive',
      { preHandler: [requirePermission(Permissions.PRODUCT_RELATION_MANAGE, 'product_relation')] },
      async (req, reply) => {
        const { id } = req.params as { id: string };
        const relationId = parseInt(id, 10);
        if (isNaN(relationId)) {
          return reply.status(400).send({
            error: { code: 'INVALID_ID', message: 'Relation ID must be an integer' },
          });
        }

        const archived = await archiveProductRelation(
          relationId,
          req.user!,
          req.ip,
          req.headers['user-agent']
        );
        return reply.send(archived);
      }
    );

    // 5. Suggestions for a Product (GET /products/:id/suggestions?lead_id=)
    authGroup.get(
      '/products/:id/suggestions',
      { preHandler: [requirePermission(Permissions.PRODUCT_VIEW, 'product')] },
      async (req, reply) => {
        const { id } = req.params as { id: string };
        const productId = parseInt(id, 10);
        if (isNaN(productId)) {
          return reply.status(400).send({
            error: { code: 'INVALID_ID', message: 'Product ID must be an integer' },
          });
        }

        const query = req.query as { lead_id?: string; leadId?: string };
        const leadIdParam = query.lead_id || query.leadId;
        const leadId = leadIdParam ? parseInt(leadIdParam, 10) : undefined;

        const suggestions = await getProductSuggestions(productId, leadId);
        return reply.send(suggestions);
      }
    );
  });
};
