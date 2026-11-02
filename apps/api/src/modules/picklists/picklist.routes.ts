import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { Permissions } from '@hospital-crm/shared';
import { prisma } from '../../database/client';
import { authenticate, requirePermission } from '../auth/auth.middleware';
import { logAudit } from '../audit/audit.service';

const createPicklistSchema = z.object({
  code: z.string().min(1).max(50),
  labelEn: z.string().min(1).max(100),
  labelMl: z.string().min(1).max(100),
  active: z.boolean().default(true),
  sort: z.number().int().default(0),
});

const updatePicklistSchema = createPicklistSchema.partial().omit({ code: true });

function getPrismaModel(type: string): any {
  switch (type) {
    case 'sources':
      return prisma.source;
    case 'departments':
      return prisma.department;
    case 'call-outcomes':
      return prisma.callOutcome;
    case 'lost-reasons':
      return prisma.lostReason;
    case 'decline-reasons':
      return prisma.declineReason;
    case 'closure-codes':
      return prisma.closureCode;
    default:
      return null;
  }
}

export const picklistRoutes: FastifyPluginAsync = async (fastify) => {
  // Public or authenticated list of picklists
  fastify.get('/picklists/:type', async (request, reply) => {
    const { type } = request.params as { type: string };
    const { scope } = (request.query as { scope?: string }) || {};
    const model = getPrismaModel(type);

    if (!model) {
      return reply.status(404).send({
        error: { code: 'INVALID_PICKLIST_TYPE', message: `Unknown picklist type: ${type}` },
      });
    }

    const where: any = { active: true };
    if (type === 'call-outcomes' && scope) {
      where.scope = { in: [scope, 'both'] };
    }

    const items = await model.findMany({
      where,
      orderBy: [{ sort: 'asc' }, { id: 'asc' }],
    });

    return reply.send(items);
  });

  // Get all items including inactive (for Admin)
  fastify.get(
    '/picklists/:type/all',
    { preHandler: [authenticate, requirePermission(Permissions.SETTINGS_MANAGE)] },
    async (request, reply) => {
      const { type } = request.params as { type: string };
      const model = getPrismaModel(type);

      if (!model) {
        return reply.status(404).send({
          error: { code: 'INVALID_PICKLIST_TYPE', message: `Unknown picklist type: ${type}` },
        });
      }

      const items = await model.findMany({
        orderBy: [{ sort: 'asc' }, { id: 'asc' }],
      });

      return reply.send(items);
    }
  );

  // Create Picklist Item
  fastify.post(
    '/picklists/:type',
    { preHandler: [authenticate, requirePermission(Permissions.SETTINGS_MANAGE)] },
    async (request, reply) => {
      const { type } = request.params as { type: string };
      const model = getPrismaModel(type);

      if (!model) {
        return reply.status(404).send({
          error: { code: 'INVALID_PICKLIST_TYPE', message: `Unknown picklist type: ${type}` },
        });
      }

      const parseResult = createPicklistSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid picklist payload',
            details: parseResult.error.format(),
          },
        });
      }

      const data = parseResult.data;
      const existing = await model.findUnique({ where: { code: data.code } });
      if (existing) {
        return reply.status(409).send({
          error: { code: 'CODE_EXISTS', message: `Code '${data.code}' already exists` },
        });
      }

      const item = await model.create({ data });

      await logAudit(prisma, {
        userId: request.user!.id,
        action: 'PICKLIST_ITEM_CREATED',
        entity: type,
        entityId: item.id,
        after: item,
        req: request,
      });

      return reply.status(201).send(item);
    }
  );

  // Update Picklist Item
  fastify.patch(
    '/picklists/:type/:id',
    { preHandler: [authenticate, requirePermission(Permissions.SETTINGS_MANAGE)] },
    async (request, reply) => {
      const { type, id } = request.params as { type: string; id: string };
      const numId = parseInt(id, 10);
      const model = getPrismaModel(type);

      if (!model) {
        return reply.status(404).send({
          error: { code: 'INVALID_PICKLIST_TYPE', message: `Unknown picklist type: ${type}` },
        });
      }

      const parseResult = updatePicklistSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid picklist payload',
            details: parseResult.error.format(),
          },
        });
      }

      const existing = await model.findUnique({ where: { id: numId } });
      if (!existing) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Picklist item not found' },
        });
      }

      const updated = await model.update({
        where: { id: numId },
        data: parseResult.data,
      });

      await logAudit(prisma, {
        userId: request.user!.id,
        action: 'PICKLIST_ITEM_UPDATED',
        entity: type,
        entityId: numId,
        before: existing,
        after: updated,
        req: request,
      });

      return reply.send(updated);
    }
  );
};
