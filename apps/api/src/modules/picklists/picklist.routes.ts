import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { Permissions, Roles } from '@hospital-crm/shared';
import { prisma } from '../../database/client';
import { authenticate } from '../auth/auth.middleware';
import { getEffectiveScope } from '../rbac/scope';
import { logAudit } from '../audit/audit.service';

const ALLOWED_PICKLIST_ROLES = [
  Roles.OWNER,
  Roles.ADMIN,
  Roles.CENTER_HEAD,
  Roles.TELECALLER_MANAGER,
  Roles.PRODUCT_MANAGER,
];

async function requirePicklistManage(request: FastifyRequest, reply: FastifyReply) {
  if (!request.user) {
    await authenticate(request, reply);
    if (reply.sent) return;
  }

  const user = request.user!;
  const hasRole = ALLOWED_PICKLIST_ROLES.includes(user.roleCode as any);
  const scope = getEffectiveScope(user, Permissions.SETTINGS_MANAGE);
  const hasPerm = scope && scope !== 'none';

  if (!hasRole && !hasPerm) {
    await logAudit(prisma, {
      userId: user.id,
      action: 'UNAUTHORIZED_ACCESS_ATTEMPT',
      entity: 'picklist',
      before: { requiredRoles: ALLOWED_PICKLIST_ROLES },
      req: request,
    });

    reply.status(403).send({
      error: {
        code: 'FORBIDDEN',
        message: 'Access denied. Master picklists can only be managed by Managing Director, Manager, or IT.',
      },
    });
    return;
  }
}

const createPicklistSchema = z.object({
  code: z.string().min(1).max(50).transform((val) => val.trim().toUpperCase().replace(/\s+/g, '_')),
  labelEn: z.string().min(1, 'English label is required').max(100),
  labelMl: z.string().max(100).optional().default(''),
  scope: z.enum(['treatment', 'product', 'both']).optional().default('both'),
  active: z.boolean().default(true),
  sort: z.coerce.number().int().default(0),
});

const updatePicklistSchema = z.object({
  labelEn: z.string().min(1).max(100).optional(),
  labelMl: z.string().max(100).optional(),
  scope: z.enum(['treatment', 'product', 'both']).optional(),
  active: z.boolean().optional(),
  sort: z.coerce.number().int().optional(),
});

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
  // Public or authenticated list of active picklists
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

  // Get all items including inactive (for MD, Manager, IT Admin)
  fastify.get(
    '/picklists/:type/all',
    { preHandler: [authenticate, requirePicklistManage] },
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
    { preHandler: [authenticate, requirePicklistManage] },
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

      const data: any = { ...parseResult.data };
      if (!data.labelMl || data.labelMl.trim() === '') {
        data.labelMl = data.labelEn;
      }
      if (type !== 'call-outcomes') {
        delete data.scope;
      }

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
    { preHandler: [authenticate, requirePicklistManage] },
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

      const updateData: any = { ...parseResult.data };
      if (type !== 'call-outcomes') {
        delete updateData.scope;
      }

      const updated = await model.update({
        where: { id: numId },
        data: updateData,
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

  // Delete Picklist Item (with in-use detection and soft-deactivate fallback)
  fastify.delete(
    '/picklists/:type/:id',
    { preHandler: [authenticate, requirePicklistManage] },
    async (request, reply) => {
      const { type, id } = request.params as { type: string; id: string };
      const { deactivateIfInUse } = (request.query as { deactivateIfInUse?: string }) || {};
      const numId = parseInt(id, 10);
      const model = getPrismaModel(type);

      if (!model) {
        return reply.status(404).send({
          error: { code: 'INVALID_PICKLIST_TYPE', message: `Unknown picklist type: ${type}` },
        });
      }

      const existing = await model.findUnique({ where: { id: numId } });
      if (!existing) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Picklist item not found' },
        });
      }

      // Check usage in referenced tables
      let usageCount = 0;
      if (type === 'sources') {
        usageCount = await prisma.lead.count({ where: { sourceId: numId } });
      } else if (type === 'departments') {
        const [lCount, cCount, tCount] = await Promise.all([
          prisma.lead.count({ where: { departmentId: numId } }),
          prisma.case.count({ where: { departmentId: numId } }),
          prisma.testimonial.count({ where: { departmentId: numId } }),
        ]);
        usageCount = lCount + cCount + tCount;
      } else if (type === 'call-outcomes') {
        usageCount = await prisma.interaction.count({ where: { outcomeId: numId } });
      } else if (type === 'lost-reasons') {
        usageCount = await prisma.lead.count({ where: { closedReasonId: numId } });
      } else if (type === 'decline-reasons') {
        usageCount = await prisma.case.count({ where: { notStartedReasonId: numId } });
      } else if (type === 'closure-codes') {
        usageCount = await prisma.case.count({ where: { closureCodeId: numId } });
      }

      if (usageCount > 0) {
        if (deactivateIfInUse === 'true') {
          const updated = await model.update({
            where: { id: numId },
            data: { active: false },
          });

          await logAudit(prisma, {
            userId: request.user!.id,
            action: 'PICKLIST_ITEM_DEACTIVATED',
            entity: type,
            entityId: numId,
            before: existing,
            after: updated,
            req: request,
          });

          return reply.send({
            success: true,
            deactivated: true,
            message: `Option '${existing.labelEn}' is referenced by ${usageCount} records and has been deactivated instead of deleted.`,
            item: updated,
          });
        }

        return reply.status(409).send({
          error: {
            code: 'ITEM_IN_USE',
            message: `Cannot permanently delete '${existing.labelEn}' because it is in use by ${usageCount} existing records. You can deactivate it instead.`,
            usageCount,
          },
        });
      }

      await model.delete({ where: { id: numId } });

      await logAudit(prisma, {
        userId: request.user!.id,
        action: 'PICKLIST_ITEM_DELETED',
        entity: type,
        entityId: numId,
        before: existing,
        req: request,
      });

      return reply.send({
        success: true,
        deleted: true,
        message: `Option '${existing.labelEn}' permanently deleted successfully.`,
      });
    }
  );
};
