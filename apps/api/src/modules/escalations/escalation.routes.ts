import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import {
  createEscalationSchema,
  decideEscalationSchema,
  Permissions,
} from '@hospital-crm/shared';
import {
  listEscalations,
  createEscalation,
  recordEscalationDecision,
} from './escalation.service';
import { authenticate, requirePermission } from '../auth/auth.middleware';

export const escalationRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.register(async (authGroup) => {
    authGroup.addHook('preHandler', authenticate);

    // 1. List Escalations
    authGroup.get(
      '/',
      {
        preHandler: [requirePermission(Permissions.CASE_VIEW, 'case')],
        schema: {
          description: 'List clinical escalations with filters',
          tags: ['Escalations'],
        },
      },
      async (req, reply) => {
        const query = req.query as any;
        const status = query.status as string | undefined;
        const assignedToMe = query.assigned_to === 'me' || query.assignedTo === 'me';
        const branchId = query.branchId ? parseInt(query.branchId, 10) : undefined;

        const results = await listEscalations(req.user!, {
          status,
          assignedToMe,
          branchId,
        });
        return reply.send({ data: results });
      }
    );

    // 2. Create Escalation (Escalate to Doctor)
    authGroup.post(
      '/',
      {
        preHandler: [requirePermission(Permissions.ESCALATION_CREATE, 'case')],
        schema: {
          description: 'Raise a clinical red flag escalation to duty doctor',
          tags: ['Escalations'],
        },
      },
      async (req, reply) => {
        const parseResult = createEscalationSchema.safeParse(req.body);
        if (!parseResult.success) {
          return reply.status(400).send({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid escalation payload',
              details: parseResult.error.format(),
            },
          });
        }

        const escalation = await createEscalation(
          req.user!,
          parseResult.data,
          req.ip,
          req.headers['user-agent']
        );
        return reply.status(201).send(escalation);
      }
    );

    // 3. Record Doctor Decision on Escalation
    authGroup.post(
      '/:id/decision',
      {
        preHandler: [requirePermission(Permissions.ESCALATION_DECIDE, 'case')],
        schema: {
          description: 'Record doctor decision on an escalation and create callback task for aftercare',
          tags: ['Escalations'],
        },
      },
      async (req, reply) => {
        const { id } = req.params as { id: string };
        const escalationId = parseInt(id, 10);
        if (isNaN(escalationId)) {
          return reply.status(400).send({
            error: { code: 'INVALID_ID', message: 'Escalation ID must be an integer' },
          });
        }

        const parseResult = decideEscalationSchema.safeParse(req.body);
        if (!parseResult.success) {
          return reply.status(400).send({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid decision payload',
              details: parseResult.error.format(),
            },
          });
        }

        const result = await recordEscalationDecision(
          req.user!,
          escalationId,
          parseResult.data,
          req.ip,
          req.headers['user-agent']
        );
        return reply.send(result);
      }
    );
  });
};
