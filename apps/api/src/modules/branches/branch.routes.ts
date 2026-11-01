import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { Permissions } from '@hospital-crm/shared';
import { prisma } from '../../database/client';
import { authenticate, requirePermission } from '../auth/auth.middleware';
import { logAudit } from '../audit/audit.service';

const createBranchSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(100),
  type: z.enum(['own', 'partner']).default('own'),
  timezone: z.string().default('Asia/Kolkata'),
  businessHours: z
    .object({
      open: z.string().default('09:00'),
      close: z.string().default('20:00'),
      days: z.array(z.number()).default([1, 2, 3, 4, 5, 6]), // Mon-Sat
    })
    .optional(),
});

export const branchRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authenticate);

  // List Branches
  fastify.get('/branches', async (_request, reply) => {
    const branches = await prisma.branch.findMany({
      where: { archivedAt: null },
      orderBy: { id: 'asc' },
    });
    return reply.send(branches);
  });

  // Create Branch
  fastify.post(
    '/branches',
    { preHandler: [requirePermission(Permissions.SETTINGS_MANAGE)] },
    async (request, reply) => {
      const parseResult = createBranchSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid branch payload',
            details: parseResult.error.format(),
          },
        });
      }

      const data = parseResult.data;
      const existing = await prisma.branch.findUnique({ where: { code: data.code } });
      if (existing) {
        return reply.status(409).send({
          error: { code: 'BRANCH_EXISTS', message: 'Branch code already exists' },
        });
      }

      const branch = await prisma.branch.create({
        data: {
          code: data.code,
          name: data.name,
          type: data.type,
          timezone: data.timezone,
          businessHours: data.businessHours ? (data.businessHours as any) : undefined,
        },
      });

      await logAudit(prisma, {
        userId: request.user!.id,
        action: 'BRANCH_CREATED',
        entity: 'branch',
        entityId: branch.id,
        after: { code: branch.code, name: branch.name },
        req: request,
      });

      return reply.status(201).send(branch);
    }
  );

  // List Teams
  fastify.get('/teams', async (_request, reply) => {
    const teams = await prisma.team.findMany({
      orderBy: { id: 'asc' },
    });
    return reply.send(teams);
  });
};
