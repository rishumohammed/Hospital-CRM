import { FastifyPluginAsync } from 'fastify';
import { Permissions, createTaskSchema, snoozeTaskSchema } from '@hospital-crm/shared';
import { requirePermission } from '../auth/auth.middleware';
import {
  listTasks,
  createTask,
  completeTask,
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
            team: { type: 'string', enum: ['support', 'admission', 'aftercare'] },
            status: { type: 'string', enum: ['open', 'done', 'cancelled', 'snoozed', 'all'] },
            due: { type: 'string', enum: ['overdue', 'today', 'upcoming'] },
            ownerId: { type: 'number' },
            leadId: { type: 'number' },
            caseId: { type: 'number' },
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
          status: query.status,
          due: query.due,
          ownerId: query.ownerId ? Number(query.ownerId) : undefined,
          leadId: query.leadId ? Number(query.leadId) : undefined,
          caseId: query.caseId ? Number(query.caseId) : undefined,
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

  // Complete a task
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
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const task = await completeTask(Number(id), request.user!);
      return reply.send(task);
    }
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
