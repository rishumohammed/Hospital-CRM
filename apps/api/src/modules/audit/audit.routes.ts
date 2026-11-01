import { FastifyPluginAsync } from 'fastify';
import { Permissions } from '@hospital-crm/shared';
import { prisma } from '../../database/client';
import { authenticate, requirePermission } from '../auth/auth.middleware';

export const auditRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authenticate);

  fastify.get(
    '/audit-logs',
    { preHandler: [requirePermission(Permissions.AUDIT_VIEW)] },
    async (request, reply) => {
      const query = request.query as any;
      const page = Math.max(1, parseInt(query.page || '1', 10));
      const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize || '20', 10)));
      const skip = (page - 1) * pageSize;

      const where: any = {};
      if (query.entity) where.entity = query.entity;
      if (query.action) where.action = query.action;
      if (query.userId) where.userId = parseInt(query.userId, 10);
      if (query.startDate || query.endDate) {
        where.createdAt = {};
        if (query.startDate) where.createdAt.gte = new Date(query.startDate);
        if (query.endDate) where.createdAt.lte = new Date(query.endDate);
      }

      const [total, logs] = await Promise.all([
        prisma.auditLog.count({ where }),
        prisma.auditLog.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        }),
      ]);

      return reply.send({
        items: logs,
        total,
        page,
        pageSize,
      });
    }
  );
};
