import { FastifyPluginAsync } from 'fastify';
import { Permissions, logCallInteractionSchema, logAftercareCallSchema } from '@hospital-crm/shared';
import { requirePermission } from '../auth/auth.middleware';
import { prisma } from '../../database/client';
import {
  checkCallLimits,
  logCallInteraction,
  logNoteInteraction,
  logAftercareCallInteraction,
  getUnifiedTimeline,
} from './interaction.service';
import { z } from 'zod';

export const interactionRoutes: FastifyPluginAsync = async (fastify) => {
  // Preflight check limits endpoint for UI live warnings
  fastify.get(
    '/check-limits',
    {
      preHandler: [requirePermission(Permissions.INTERACTION_CREATE, 'lead')],
      schema: {
        description: 'Check contact rules and calling hours before placing a call',
        tags: ['Interactions'],
        querystring: {
          type: 'object',
          properties: {
            leadId: { type: 'number' },
            caseId: { type: 'number' },
          },
        },
      },
    },
    async (request, reply) => {
      const query = request.query as any;
      const leadId = query.leadId ? Number(query.leadId) : undefined;
      const caseId = query.caseId ? Number(query.caseId) : undefined;

      if (!leadId && !caseId) {
        return reply.status(400).send({
          error: { code: 'INVALID_INPUT', message: 'Either leadId or caseId must be provided' },
        });
      }

      const resourceType = leadId ? 'lead' : 'case';
      const resourceId = (leadId || caseId)!;

      const result = await checkCallLimits(resourceType, resourceId);
      return reply.send(result);
    }
  );

  // Atomic call logging endpoint
  fastify.post(
    '/call',
    {
      preHandler: [requirePermission(Permissions.INTERACTION_CREATE, 'lead')],
      schema: {
        description: 'Log a call interaction atomically with mandatory next action or closure',
        tags: ['Interactions'],
      },
    },
    async (request, reply) => {
      const parseResult = logCallInteractionSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: parseResult.error.format(),
          },
        });
      }

      const result = await logCallInteraction(parseResult.data as any, request.user!);
      return reply.status(201).send(result);
    }
  );

  // Aftercare call logging endpoint
  fastify.post(
    '/aftercare-call',
    {
      preHandler: [requirePermission(Permissions.INTERACTION_CREATE, 'case')],
      schema: {
        description: 'Log an aftercare questionnaire call interaction with automated triggers',
        tags: ['Interactions'],
      },
    },
    async (request, reply) => {
      const parseResult = logAftercareCallSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid aftercare call payload',
            details: parseResult.error.format(),
          },
        });
      }

      const result = await logAftercareCallInteraction(parseResult.data as any, request.user!);
      return reply.status(201).send(result);
    }
  );

  // Note logging endpoint
  fastify.post(
    '/note',
    {
      preHandler: [requirePermission(Permissions.INTERACTION_CREATE, 'lead')],
      schema: {
        description: 'Log a note on a lead or case',
        tags: ['Interactions'],
      },
    },
    async (request, reply) => {
      const schema = z.object({
        leadId: z.number().int().positive().optional().nullable(),
        caseId: z.number().int().positive().optional().nullable(),
        note: z.string().min(1, 'Note content is required').max(2000),
      });

      const parseResult = schema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid note data',
            details: parseResult.error.format(),
          },
        });
      }

      const resourceType = parseResult.data.leadId ? 'lead' : 'case';
      const resourceId = (parseResult.data.leadId || parseResult.data.caseId)!;

      const result = await logNoteInteraction(resourceType, resourceId, parseResult.data.note, request.user!);
      return reply.status(201).send(result);
    }
  );

  // Unified timeline endpoint
  fastify.get(
    '/timeline',
    {
      preHandler: [requirePermission(Permissions.LEAD_VIEW, 'lead')],
      schema: {
        description: 'Get unified chronological activity timeline for a lead or case',
        tags: ['Interactions'],
        querystring: {
          type: 'object',
          properties: {
            leadId: { type: 'number' },
            caseId: { type: 'number' },
          },
        },
      },
    },
    async (request, reply) => {
      const query = request.query as any;
      const leadId = query.leadId ? Number(query.leadId) : undefined;
      const caseId = query.caseId ? Number(query.caseId) : undefined;

      if (!leadId && !caseId) {
        return reply.status(400).send({
          error: { code: 'INVALID_INPUT', message: 'Either leadId or caseId must be provided' },
        });
      }

      const resourceType = leadId ? 'lead' : 'case';
      const resourceId = (leadId || caseId)!;

      const timeline = await getUnifiedTimeline(resourceType, resourceId);
      return reply.send({ timeline });
    }
  );

  // Delete an interaction (for correcting mistaken logs)
  fastify.delete(
    '/:id',
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const numId = Number(id);
      if (isNaN(numId)) {
        return reply.status(400).send({ error: { code: 'INVALID_ID', message: 'Invalid interaction ID' } });
      }

      const user = request.user;
      if (!user) {
        return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } });
      }

      const existing = await prisma.interaction.findUnique({ where: { id: numId } });
      if (!existing) {
        return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Interaction not found' } });
      }

      // Allow owner, admin, center_head, or the creator to delete
      const canDelete =
        user.roleCode === 'owner' ||
        user.roleCode === 'admin' ||
        user.roleCode === 'center_head' ||
        existing.userId === user.id;

      if (!canDelete) {
        return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Permission denied to delete interaction' } });
      }

      await prisma.interaction.delete({ where: { id: numId } });
      return reply.send({ success: true, message: 'Interaction deleted' });
    }
  );
};
