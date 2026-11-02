import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { createUserSchema, updateUserSchema, Permissions } from '@hospital-crm/shared';
import { prisma } from '../../database/client';
import { hashPassword } from '../auth/password';
import { authenticate, requirePermission } from '../auth/auth.middleware';
import { logAudit } from '../audit/audit.service';

const deactivateUserSchema = z.object({
  reassignToUserId: z.number().int().positive().optional().nullable(),
  reason: z.string().min(1, 'Reason is required').max(500),
});

export const userRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authenticate);

  // List Users
  fastify.get(
    '/users',
    { preHandler: [requirePermission(Permissions.USER_MANAGE)] },
    async (request, reply) => {
      const query = request.query as any;
      const page = Math.max(1, parseInt(query.page || '1', 10));
      const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize || '20', 10)));
      const skip = (page - 1) * pageSize;

      const where: any = { archivedAt: null };
      if (query.roleId) where.roleId = parseInt(query.roleId, 10);
      if (query.status) where.status = query.status;
      if (query.branchId) {
        where.userBranches = {
          some: { branchId: parseInt(query.branchId, 10) },
        };
      }
      if (query.search) {
        where.OR = [
          { name: { contains: query.search } },
          { email: { contains: query.search } },
          { mobile: { contains: query.search } },
        ];
      }

      const [total, users] = await Promise.all([
        prisma.user.count({ where }),
        prisma.user.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: { createdAt: 'desc' },
          include: {
            role: true,
            userBranches: { include: { branch: true } },
            userTeams: { include: { team: true } },
          },
        }),
      ]);

      const sanitizedUsers = users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        mobile: u.mobile,
        language: u.language,
        status: u.status,
        available: u.available,
        dutyNurse: u.dutyNurse,
        dutyDoctor: u.dutyDoctor,
        role: {
          id: u.role.id,
          code: u.role.code,
          name: u.role.name,
        },
        branches: u.userBranches.map((ub) => ub.branch),
        teams: u.userTeams.map((ut) => ut.team),
        createdAt: u.createdAt,
      }));

      return reply.send({
        items: sanitizedUsers,
        total,
        page,
        pageSize,
      });
    }
  );

  // Create User
  fastify.post(
    '/users',
    { preHandler: [requirePermission(Permissions.USER_MANAGE)] },
    async (request, reply) => {
      const parseResult = createUserSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid user payload',
            details: parseResult.error.format(),
          },
        });
      }

      const data = parseResult.data;

      // Check email uniqueness
      const existing = await prisma.user.findUnique({
        where: { email: data.email.toLowerCase().trim() },
      });
      if (existing) {
        return reply.status(409).send({
          error: {
            code: 'EMAIL_EXISTS',
            message: 'A user with this email address already exists.',
          },
        });
      }

      const passwordHash = await hashPassword(data.password);

      // Find teams by codes
      const teams = await prisma.team.findMany({
        where: { code: { in: data.teamCodes } },
      });

      const user = await prisma.user.create({
        data: {
          name: data.name,
          email: data.email.toLowerCase().trim(),
          mobile: data.mobile,
          passwordHash,
          roleId: data.roleId,
          language: data.language,
          dutyNurse: data.dutyNurse,
          dutyDoctor: data.dutyDoctor,
          userBranches: {
            create: data.branchIds.map((branchId) => ({ branchId })),
          },
          userTeams: {
            create: teams.map((t) => ({ teamId: t.id })),
          },
        },
        include: {
          role: true,
          userBranches: { include: { branch: true } },
          userTeams: { include: { team: true } },
        },
      });

      await logAudit(prisma, {
        userId: request.user!.id,
        action: 'USER_CREATED',
        entity: 'user',
        entityId: user.id,
        after: { email: user.email, roleId: user.roleId },
        req: request,
      });

      return reply.status(201).send({
        id: user.id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        branches: user.userBranches.map((ub) => ub.branch),
        teams: user.userTeams.map((ut) => ut.team),
      });
    }
  );

  // Get Single User
  fastify.get(
    '/users/:id',
    { preHandler: [requirePermission(Permissions.USER_MANAGE)] },
    async (request, reply) => {
      const id = parseInt((request.params as any).id, 10);
      const user = await prisma.user.findUnique({
        where: { id },
        include: {
          role: { include: { permissions: true } },
          userBranches: { include: { branch: true } },
          userTeams: { include: { team: true } },
          permissionGrants: {
            where: { endsAt: { gte: new Date() } },
          },
        },
      });

      if (!user || user.archivedAt) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'User not found' },
        });
      }

      return reply.send({
        id: user.id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        language: user.language,
        status: user.status,
        available: user.available,
        dutyNurse: user.dutyNurse,
        dutyDoctor: user.dutyDoctor,
        role: user.role,
        branches: user.userBranches.map((ub) => ub.branch),
        teams: user.userTeams.map((ut) => ut.team),
        grants: user.permissionGrants,
      });
    }
  );

  // Update User
  fastify.patch(
    '/users/:id',
    { preHandler: [requirePermission(Permissions.USER_MANAGE)] },
    async (request, reply) => {
      const id = parseInt((request.params as any).id, 10);
      const parseResult = updateUserSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid update payload',
            details: parseResult.error.format(),
          },
        });
      }

      const existing = await prisma.user.findUnique({
        where: { id },
        include: { userBranches: true, userTeams: true },
      });

      if (!existing || existing.archivedAt) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'User not found' },
        });
      }

      const data = parseResult.data;
      const updatePayload: any = {};

      if (data.name) updatePayload.name = data.name;
      if (data.email) updatePayload.email = data.email.toLowerCase().trim();
      if (data.mobile) updatePayload.mobile = data.mobile;
      if (data.roleId) updatePayload.roleId = data.roleId;
      if (data.language) updatePayload.language = data.language;
      if (data.status) updatePayload.status = data.status;
      if (data.dutyNurse !== undefined) updatePayload.dutyNurse = data.dutyNurse;
      if (data.dutyDoctor !== undefined) updatePayload.dutyDoctor = data.dutyDoctor;
      if (data.password && data.password.trim().length >= 8) {
        updatePayload.passwordHash = await hashPassword(data.password.trim());
      }

      // Execute update inside transaction
      const updatedUser = await prisma.$transaction(async (tx) => {
        if (data.branchIds) {
          await tx.userBranch.deleteMany({ where: { userId: id } });
          await tx.userBranch.createMany({
            data: data.branchIds.map((branchId) => ({ userId: id, branchId })),
          });
        }

        if (data.teamCodes) {
          const teams = await tx.team.findMany({
            where: { code: { in: data.teamCodes } },
          });
          await tx.userTeam.deleteMany({ where: { userId: id } });
          await tx.userTeam.createMany({
            data: teams.map((t) => ({ userId: id, teamId: t.id })),
          });
        }

        return await tx.user.update({
          where: { id },
          data: updatePayload,
          include: {
            role: true,
            userBranches: { include: { branch: true } },
            userTeams: { include: { team: true } },
          },
        });
      });

      await logAudit(prisma, {
        userId: request.user!.id,
        action: 'USER_UPDATED',
        entity: 'user',
        entityId: id,
        before: { roleId: existing.roleId },
        after: { roleId: updatedUser.roleId },
        req: request,
      });

      return reply.send({
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        mobile: updatedUser.mobile,
        role: updatedUser.role,
        branches: updatedUser.userBranches.map((ub) => ub.branch),
        teams: updatedUser.userTeams.map((ut) => ut.team),
      });
    }
  );

  // Deactivate User with Reassignment Wizard
  fastify.post(
    '/users/:id/deactivate',
    { preHandler: [requirePermission(Permissions.USER_MANAGE)] },
    async (request, reply) => {
      const id = parseInt((request.params as any).id, 10);
      const parseResult = deactivateUserSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid deactivation payload',
            details: parseResult.error.format(),
          },
        });
      }

      const { reassignToUserId, reason } = parseResult.data;

      const user = await prisma.user.findUnique({ where: { id } });
      if (!user || user.archivedAt) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'User not found' },
        });
      }

      // Check open record counts
      const [openLeadsCount, openCasesCount, openTasksCount] = await Promise.all([
        prisma.lead.count({
          where: { ownerId: id, status: { notIn: ['converted', 'closed', 'junk'] }, archivedAt: null },
        }),
        prisma.case.count({
          where: { ownerId: id, stage: { notIn: ['completed', 'not_started', 'dropped_out'] }, archivedAt: null },
        }),
        prisma.task.count({
          where: { ownerId: id, status: 'open', archivedAt: null },
        }),
      ]);

      let reassigned = false;
      if (reassignToUserId) {
        const targetUser = await prisma.user.findFirst({
          where: { id: reassignToUserId, status: 'active', archivedAt: null },
        });

        if (!targetUser) {
          return reply.status(400).send({
            error: {
              code: 'INVALID_TARGET_USER',
              message: 'Target user for reassignment does not exist or is inactive',
            },
          });
        }

        await prisma.$transaction(async (tx) => {
          // Reassign open leads
          await tx.lead.updateMany({
            where: { ownerId: id, status: { notIn: ['converted', 'closed', 'junk'] }, archivedAt: null },
            data: { ownerId: reassignToUserId },
          });

          // Reassign open cases
          await tx.case.updateMany({
            where: { ownerId: id, stage: { notIn: ['completed', 'not_started', 'dropped_out'] }, archivedAt: null },
            data: { ownerId: reassignToUserId },
          });

          // Reassign open tasks
          await tx.task.updateMany({
            where: { ownerId: id, status: 'open', archivedAt: null },
            data: { ownerId: reassignToUserId },
          });

          // Deactivate source user
          await tx.user.update({
            where: { id },
            data: { status: 'inactive', available: false },
          });
        });
        reassigned = true;
      } else {
        await prisma.user.update({
          where: { id },
          data: { status: 'inactive', available: false },
        });
      }

      await logAudit(prisma, {
        userId: request.user!.id,
        action: 'USER_DEACTIVATED',
        entity: 'user',
        entityId: id,
        before: { status: user.status },
        after: { status: 'inactive', reassignedTo: reassignToUserId, reason },
        req: request,
      });

      return reply.send({
        success: true,
        userId: id,
        status: 'inactive',
        reassigned,
        reassignedRecords: {
          leads: openLeadsCount,
          cases: openCasesCount,
          tasks: openTasksCount,
        },
      });
    }
  );

  // Soft Delete User (Archive)
  fastify.delete(
    '/users/:id',
    { preHandler: [requirePermission(Permissions.USER_MANAGE)] },
    async (request, reply) => {
      const id = parseInt((request.params as any).id, 10);
      const user = await prisma.user.findUnique({ where: { id } });
      if (!user || user.archivedAt) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'User not found or already deleted' },
        });
      }

      if (request.user?.id === id) {
        return reply.status(400).send({
          error: { code: 'CANNOT_DELETE_SELF', message: 'You cannot delete your own account' },
        });
      }

      const body = (request.body || {}) as { reassignToUserId?: number; reason?: string };
      const reassignToUserId = body.reassignToUserId;

      await prisma.$transaction(async (tx) => {
        if (reassignToUserId) {
          await tx.lead.updateMany({
            where: { ownerId: id, status: { notIn: ['converted', 'closed', 'junk'] }, archivedAt: null },
            data: { ownerId: reassignToUserId },
          });
          await tx.case.updateMany({
            where: { ownerId: id, stage: { notIn: ['completed', 'not_started', 'dropped_out'] }, archivedAt: null },
            data: { ownerId: reassignToUserId },
          });
          await tx.task.updateMany({
            where: { ownerId: id, status: 'open', archivedAt: null },
            data: { ownerId: reassignToUserId },
          });
        }

        await tx.user.update({
          where: { id },
          data: {
            archivedAt: new Date(),
            status: 'inactive',
            available: false,
          },
        });
      });

      await logAudit(prisma, {
        userId: request.user!.id,
        action: 'USER_DELETED',
        entity: 'user',
        entityId: id,
        before: { name: user.name, email: user.email, status: user.status },
        after: { archivedAt: new Date(), status: 'inactive', reason: body.reason },
        req: request,
      });

      return reply.send({
        success: true,
        message: 'User soft deleted successfully',
        userId: id,
      });
    }
  );

  // Reactivate User
  fastify.post(
    '/users/:id/reactivate',
    { preHandler: [requirePermission(Permissions.USER_MANAGE)] },
    async (request, reply) => {
      const id = parseInt((request.params as any).id, 10);
      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'User not found' },
        });
      }

      await prisma.user.update({
        where: { id },
        data: {
          status: 'active',
          available: true,
          archivedAt: null,
        },
      });

      await logAudit(prisma, {
        userId: request.user!.id,
        action: 'USER_REACTIVATED',
        entity: 'user',
        entityId: id,
        before: { status: user.status },
        after: { status: 'active' },
        req: request,
      });

      return reply.send({
        success: true,
        message: 'User reactivated successfully',
        userId: id,
      });
    }
  );
};
