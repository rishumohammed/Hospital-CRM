import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { Permissions, Scopes } from '@hospital-crm/shared';
import { prisma } from '../../database/client';
import { authenticate, requirePermission } from '../auth/auth.middleware';
import { logAudit } from '../audit/audit.service';

const updateRolePermissionsSchema = z.object({
  permissions: z.array(
    z.object({
      permission: z.string().min(1),
      scope: z.enum([Scopes.OWN, Scopes.TEAM, Scopes.BRANCH, Scopes.ALL]),
    })
  ),
});

const createPermissionGrantSchema = z.object({
  userId: z.number().int().positive(),
  permission: z.string().min(1),
  scope: z.enum([Scopes.OWN, Scopes.TEAM, Scopes.BRANCH, Scopes.ALL]),
  reason: z.string().min(1, 'Reason is required').max(1000),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime({ message: 'Valid expiration date required' }),
});

export const rbacRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authenticate);

  // List Roles
  fastify.get(
    '/roles',
    { preHandler: [requirePermission(Permissions.ROLE_MANAGE)] },
    async (_request, reply) => {
      const roles = await prisma.role.findMany({
        include: {
          permissions: true,
          _count: { select: { users: true } },
        },
        orderBy: { id: 'asc' },
      });

      return reply.send(
        roles.map((r) => ({
          id: r.id,
          code: r.code,
          name: r.name,
          maskPhone: r.maskPhone,
          userCount: r._count.users,
          permissions: r.permissions.map((p) => ({
            id: p.id,
            permission: p.permission,
            scope: p.scope,
          })),
        }))
      );
    }
  );

  // Get Role Detail
  fastify.get(
    '/roles/:id',
    { preHandler: [requirePermission(Permissions.ROLE_MANAGE)] },
    async (request, reply) => {
      const id = parseInt((request.params as any).id, 10);
      const role = await prisma.role.findUnique({
        where: { id },
        include: { permissions: true },
      });

      if (!role) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Role not found' },
        });
      }

      return reply.send(role);
    }
  );

  // Update Role Permissions
  fastify.patch(
    '/roles/:id/permissions',
    { preHandler: [requirePermission(Permissions.ROLE_MANAGE)] },
    async (request, reply) => {
      const id = parseInt((request.params as any).id, 10);
      const parseResult = updateRolePermissionsSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid permissions payload',
            details: parseResult.error.format(),
          },
        });
      }

      const role = await prisma.role.findUnique({ where: { id } });
      if (!role) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Role not found' },
        });
      }

      const { permissions } = parseResult.data;

      // Update in transaction: clear existing and insert new
      await prisma.$transaction(async (tx) => {
        await tx.rolePermission.deleteMany({ where: { roleId: id } });
        if (permissions.length > 0) {
          await tx.rolePermission.createMany({
            data: permissions.map((p) => ({
              roleId: id,
              permission: p.permission,
              scope: p.scope,
            })),
          });
        }
      });

      await logAudit(prisma, {
        userId: request.user!.id,
        action: 'ROLE_PERMISSIONS_UPDATED',
        entity: 'role',
        entityId: id,
        after: { permissionsCount: permissions.length },
        req: request,
      });

      const updatedRole = await prisma.role.findUnique({
        where: { id },
        include: { permissions: true },
      });

      return reply.send(updatedRole);
    }
  );

  // Create Temporary Permission Grant (Owner or Admin granted access)
  fastify.post(
    '/permission-grants',
    { preHandler: [requirePermission(Permissions.ROLE_MANAGE)] },
    async (request, reply) => {
      const parseResult = createPermissionGrantSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid grant payload',
            details: parseResult.error.format(),
          },
        });
      }

      const data = parseResult.data;
      const targetUser = await prisma.user.findUnique({ where: { id: data.userId } });
      if (!targetUser) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Target user not found' },
        });
      }

      const startsAt = data.startsAt ? new Date(data.startsAt) : new Date();
      const endsAt = new Date(data.endsAt);

      if (endsAt <= startsAt) {
        return reply.status(400).send({
          error: {
            code: 'INVALID_TIMEFRAME',
            message: 'endsAt must be after startsAt',
          },
        });
      }

      const grant = await prisma.permissionGrant.create({
        data: {
          userId: data.userId,
          permission: data.permission,
          scope: data.scope,
          reason: data.reason,
          startsAt,
          endsAt,
          grantedBy: request.user!.id,
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
          granter: { select: { id: true, name: true, email: true } },
        },
      });

      await logAudit(prisma, {
        userId: request.user!.id,
        action: 'PERMISSION_GRANT_CREATED',
        entity: 'permission_grant',
        entityId: grant.id,
        after: {
          userId: grant.userId,
          permission: grant.permission,
          scope: grant.scope,
          endsAt: grant.endsAt,
          reason: grant.reason,
        },
        req: request,
      });

      return reply.status(201).send(grant);
    }
  );

  // List Permission Grants
  fastify.get(
    '/permission-grants',
    { preHandler: [requirePermission(Permissions.AUDIT_VIEW)] },
    async (_request, reply) => {
      const grants = await prisma.permissionGrant.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true } },
          granter: { select: { id: true, name: true, email: true } },
        },
      });

      return reply.send(grants);
    }
  );
};
