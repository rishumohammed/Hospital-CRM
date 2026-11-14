import { FastifyPluginAsync } from 'fastify';
import { Permissions, createTaskSchema, snoozeTaskSchema } from '@hospital-crm/shared';
import { requirePermission } from '../auth/auth.middleware';
import {
  listTasks,
  createTask,
  completeTask,
  cancelTask,
  snoozeTask,
  rescheduleTask,
  reassignTask,
} from './task.service';
import { z } from 'zod';

export const taskRoutes: FastifyPluginAsync = async (fastify) => {
  // List tasks with filters and RBAC scope
  fastify.get(
    '/',
    {
      preHandler: [requirePermission(Permissions.TASK_VIEW, 'task')],
      schema: {
        description: 'List tasks with filtering by team, status, due timing, and owner',
        tags: ['Tasks'],
        querystring: {
          type: 'object',
          properties: {
            team: { type: 'string', enum: ['support', 'admission', 'aftercare', 'product'] },
            category: { type: 'string', enum: ['all', 'enquiry', 'appointment', 'today_visits', 'post_visit'] },
            status: { type: 'string', enum: ['open', 'done', 'cancelled', 'snoozed', 'all'] },
            due: { type: 'string', enum: ['overdue', 'today', 'upcoming', 'appointments', 'appointment_followups', 'today_visits'] },
            priority: { type: 'string', enum: ['hot', 'warm', 'cold'] },
            ownerId: { type: 'number' },
            leadId: { type: 'number' },
            caseId: { type: 'number' },
            search: { type: 'string' },
            nextStepOnly: { type: 'boolean' },
            page: { type: 'number' },
            pageSize: { type: 'number' },
          },
        },
      },
    },
    async (request, reply) => {
      const query = request.query as any;
      const result = await listTasks(
        {
          team: query.team,
          category: query.category,
          status: query.status,
          due: query.due,
          priority: query.priority ? String(query.priority) as any : undefined,
          ownerId: query.ownerId ? Number(query.ownerId) : undefined,
          leadId: query.leadId ? Number(query.leadId) : undefined,
          caseId: query.caseId ? Number(query.caseId) : undefined,
          search: query.search ? String(query.search) : undefined,
          nextStepOnly: query.nextStepOnly !== undefined ? query.nextStepOnly === true || query.nextStepOnly === 'true' : undefined,
          page: query.page ? Number(query.page) : undefined,
          pageSize: query.pageSize ? Number(query.pageSize) : undefined,
        },
        request.user!
      );
      return reply.send(result);
    }
  );

  // Create an ad-hoc task
  fastify.post(
    '/',
    {
      preHandler: [requirePermission(Permissions.TASK_MANAGE, 'task')],
      schema: {
        description: 'Create an ad-hoc task',
        tags: ['Tasks'],
      },
    },
    async (request, reply) => {
      const parseResult = createTaskSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid task data',
            details: parseResult.error.format(),
          },
        });
      }

      const task = await createTask(parseResult.data, request.user!);
      return reply.status(201).send(task);
    }
  );

  // Complete a task (supports both POST and PATCH)
  const completeHandler = async (request: any, reply: any) => {
    const { id } = request.params as { id: string };
    const task = await completeTask(Number(id), request.user!);
    return reply.send(task);
  };

  fastify.post(
    '/:id/complete',
    {
      preHandler: [requirePermission(Permissions.TASK_MANAGE, 'task')],
      schema: {
        description: 'Mark a task as completed',
        tags: ['Tasks'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'number' },
          },
          required: ['id'],
        },
      },
    },
    completeHandler
  );

  fastify.patch(
    '/:id/complete',
    {
      preHandler: [requirePermission(Permissions.TASK_MANAGE, 'task')],
      schema: {
        description: 'Mark a task as completed',
        tags: ['Tasks'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'number' },
          },
          required: ['id'],
        },
      },
    },
    completeHandler
  );

  // Cancel a task (supports both POST and PATCH)
  const cancelHandler = async (request: any, reply: any) => {
    const { id } = request.params as { id: string };
    const body = (request.body as { reason?: string } | undefined) || {};
    const task = await cancelTask(Number(id), request.user!, body.reason);
    return reply.send(task);
  };

  fastify.post(
    '/:id/cancel',
    {
      preHandler: [requirePermission(Permissions.TASK_MANAGE, 'task')],
      schema: {
        description: 'Cancel a task with an optional reason',
        tags: ['Tasks'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'number' },
          },
          required: ['id'],
        },
      },
    },
    cancelHandler
  );

  fastify.patch(
    '/:id/cancel',
    {
      preHandler: [requirePermission(Permissions.TASK_MANAGE, 'task')],
      schema: {
        description: 'Cancel a task with an optional reason',
        tags: ['Tasks'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'number' },
          },
          required: ['id'],
        },
      },
    },
    cancelHandler
  );

  // Snooze a task
  fastify.post(
    '/:id/snooze',
    {
      preHandler: [requirePermission(Permissions.TASK_MANAGE, 'task')],
      schema: {
        description: 'Snooze a task until a new due time (max 2 times without manager approval)',
        tags: ['Tasks'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'number' },
          },
          required: ['id'],
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const parseResult = snoozeTaskSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid snooze data',
            details: parseResult.error.format(),
          },
        });
      }

      const task = await snoozeTask(Number(id), parseResult.data, request.user!);
      return reply.send(task);
    }
  );

  // Reschedule a task
  fastify.post(
    '/:id/reschedule',
    {
      preHandler: [requirePermission(Permissions.TASK_MANAGE, 'task')],
      schema: {
        description: 'Reschedule a task to a new due time',
        tags: ['Tasks'],
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const schema = z.object({
        newDueAt: z.string().datetime(),
        reason: z.string().min(1).max(500),
      });

      const parseResult = schema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'Invalid reschedule data' },
        });
      }

      const task = await rescheduleTask(Number(id), parseResult.data, request.user!);
      return reply.send(task);
    }
  );

  // Reassign a task
  fastify.post(
    '/:id/reassign',
    {
      preHandler: [requirePermission(Permissions.TASK_MANAGE, 'task')],
      schema: {
        description: 'Reassign a task to another user',
        tags: ['Tasks'],
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const schema = z.object({
        newOwnerId: z.number().int().positive(),
        reason: z.string().max(500).optional(),
      });

      const parseResult = schema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'Invalid reassignment data' },
        });
      }

      const task = await reassignTask(Number(id), parseResult.data, request.user!);
      return reply.send(task);
    }
  );
};
