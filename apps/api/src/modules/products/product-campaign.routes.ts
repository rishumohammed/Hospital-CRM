import { FastifyPluginAsync } from 'fastify';
import {
  createProductCampaignSchema,
  updateProductCampaignSchema,
  Permissions,
} from '@hospital-crm/shared';
import {
  listProductCampaigns,
  getProductCampaignById,
  createProductCampaign,
  updateProductCampaign,
  setCampaignProducts,
} from './product-campaign.service';
import { authenticate, requirePermission } from '../auth/auth.middleware';

export const productCampaignRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.register(async (authGroup) => {
    authGroup.addHook('preHandler', authenticate);

    // 1. List Campaigns
    authGroup.get(
      '/product-campaigns',
      { preHandler: [requirePermission([Permissions.PRODUCT_CAMPAIGN_MANAGE, Permissions.PRODUCT_VIEW], 'product_campaign')] },
      async (req, reply) => {
        const query = req.query as any;
        const params = {
          search: query.search,
          status: query.status,
          channel: query.channel,
          page: query.page ? parseInt(query.page, 10) : 1,
          pageSize: query.pageSize ? parseInt(query.pageSize, 10) : 20,
          sortBy: query.sortBy,
          sortOrder: query.sortOrder,
        };

        const result = await listProductCampaigns(params, req.user!);
        return reply.send(result);
      }
    );

    // 2. Create Campaign
    authGroup.post(
      '/product-campaigns',
      { preHandler: [requirePermission(Permissions.PRODUCT_CAMPAIGN_MANAGE, 'product_campaign')] },
      async (req, reply) => {
        const parseResult = createProductCampaignSchema.safeParse(req.body);
        if (!parseResult.success) {
          return reply.status(400).send({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid product campaign payload',
              details: parseResult.error.format(),
            },
          });
        }

        const campaign = await createProductCampaign(
          parseResult.data,
          req.user!,
          req.ip,
          req.headers['user-agent']
        );
        return reply.status(201).send(campaign);
      }
    );

    // 3. Get Campaign Detail by ID
    authGroup.get(
      '/product-campaigns/:id',
      { preHandler: [requirePermission([Permissions.PRODUCT_CAMPAIGN_MANAGE, Permissions.PRODUCT_VIEW], 'product_campaign')] },
      async (req, reply) => {
        const { id } = req.params as { id: string };
        const campaignId = parseInt(id, 10);
        if (isNaN(campaignId)) {
          return reply.status(400).send({
            error: { code: 'INVALID_ID', message: 'Campaign ID must be an integer' },
          });
        }

        const campaign = await getProductCampaignById(campaignId, req.user!);
        return reply.send(campaign);
      }
    );

    // 4. Update Campaign
    authGroup.patch(
      '/product-campaigns/:id',
      { preHandler: [requirePermission(Permissions.PRODUCT_CAMPAIGN_MANAGE, 'product_campaign')] },
      async (req, reply) => {
        const { id } = req.params as { id: string };
        const campaignId = parseInt(id, 10);
        if (isNaN(campaignId)) {
          return reply.status(400).send({
            error: { code: 'INVALID_ID', message: 'Campaign ID must be an integer' },
          });
        }

        const parseResult = updateProductCampaignSchema.safeParse(req.body);
        if (!parseResult.success) {
          return reply.status(400).send({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid campaign update payload',
              details: parseResult.error.format(),
            },
          });
        }

        const updated = await updateProductCampaign(
          campaignId,
          parseResult.data,
          req.user!,
          req.ip,
          req.headers['user-agent']
        );
        return reply.send(updated);
      }
    );

    // 5. Update Campaign Products
    authGroup.post(
      '/product-campaigns/:id/products',
      { preHandler: [requirePermission(Permissions.PRODUCT_CAMPAIGN_MANAGE, 'product_campaign')] },
      async (req, reply) => {
        const { id } = req.params as { id: string };
        const campaignId = parseInt(id, 10);
        if (isNaN(campaignId)) {
          return reply.status(400).send({
            error: { code: 'INVALID_ID', message: 'Campaign ID must be an integer' },
          });
        }

        const body = req.body as { productIds?: number[]; product_ids?: number[] };
        const productIds = body.productIds ?? body.product_ids ?? [];

        const result = await setCampaignProducts(
          campaignId,
          productIds,
          req.user!,
          req.ip,
          req.headers['user-agent']
        );
        return reply.send(result);
      }
    );
  });
};
