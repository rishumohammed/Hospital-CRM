import { FastifyPluginAsync } from 'fastify';
import { Permissions, maskPhoneNumber } from '@hospital-crm/shared';
import { prisma } from '../../database/client';
import { authenticate, requirePermission } from '../auth/auth.middleware';
import { scopeWhere } from '../rbac/scope';
import { logAudit } from '../audit/audit.service';

export const leadRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authenticate);

  // List Leads (enforcing scopeWhere)
  fastify.get(
    '/leads',
    { preHandler: [requirePermission(Permissions.LEAD_VIEW, 'lead')] },
    async (request, reply) => {
      const query = request.query as any;
      const page = Math.max(1, parseInt(query.page || '1', 10));
      const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize || '20', 10)));
      const skip = (page - 1) * pageSize;

      // Base scope filter
      const userScope = scopeWhere(request.user!, 'lead');

      const where: any = {
        ...userScope,
      };

      if (query.status) where.status = query.status;
      if (query.priority) where.priority = query.priority;
      if (query.branchId) where.branchId = parseInt(query.branchId, 10);
      if (query.departmentId) where.departmentId = parseInt(query.departmentId, 10);
      if (query.search) {
        where.OR = [
          { name: { contains: query.search } },
          { mobileNorm: { contains: query.search } },
          { concern: { contains: query.search } }, // Malayalam search supported via utf8mb4_unicode_ci
        ];
      }

      const [total, leads] = await Promise.all([
        prisma.lead.count({ where }),
        prisma.lead.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: { createdAt: 'desc' },
          include: {
            department: true,
            source: true,
            owner: { select: { id: true, name: true, email: true } },
            branch: { select: { id: true, code: true, name: true } },
          },
        }),
      ]);

      // Apply phone masking if user's role has maskPhone: true
      const shouldMaskPhone = request.user!.maskPhone;
      const sanitizedLeads = leads.map((lead) => ({
        ...lead,
        mobile: shouldMaskPhone ? maskPhoneNumber(lead.mobile) : lead.mobile,
        altMobile: shouldMaskPhone ? maskPhoneNumber(lead.altMobile) : lead.altMobile,
      }));

      return reply.send({
        items: sanitizedLeads,
        total,
        page,
        pageSize,
      });
    }
  );

  // Get Lead by ID (Direct URL / API access check)
  fastify.get(
    '/leads/:id',
    { preHandler: [requirePermission(Permissions.LEAD_VIEW, 'lead')] },
    async (request, reply) => {
      const id = parseInt((request.params as any).id, 10);

      // Check existence first to distinguish 404 from 403 direct URL tampering
      const existingLead = await prisma.lead.findFirst({
        where: { id, archivedAt: null },
      });

      if (!existingLead) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Lead not found' },
        });
      }

      // Query enforcing user scope
      const lead = await prisma.lead.findFirst({
        where: {
          id,
          ...scopeWhere(request.user!, 'lead'),
        },
        include: {
          department: true,
          source: true,
          owner: { select: { id: true, name: true, email: true } },
          branch: { select: { id: true, code: true, name: true } },
        },
      });

      // Acceptance Test 1: Out of scope access returns 403 and writes an audit log
      if (!lead) {
        await logAudit(prisma, {
          userId: request.user!.id,
          action: 'OUT_OF_SCOPE_LEAD_ACCESS_BLOCKED',
          entity: 'lead',
          entityId: id,
          before: { requestedId: id, ownerId: existingLead.ownerId },
          req: request,
        });

        return reply.status(403).send({
          error: {
            code: 'FORBIDDEN',
            message: 'Access denied: You do not have permission to view this lead record.',
          },
        });
      }

      // Log audit for lead open
      await logAudit(prisma, {
        userId: request.user!.id,
        action: 'LEAD_OPENED',
        entity: 'lead',
        entityId: lead.id,
        req: request,
      });

      const shouldMaskPhone = request.user!.maskPhone;
      return reply.send({
        ...lead,
        mobile: shouldMaskPhone ? maskPhoneNumber(lead.mobile) : lead.mobile,
        altMobile: shouldMaskPhone ? maskPhoneNumber(lead.altMobile) : lead.altMobile,
      });
    }
  );
};
