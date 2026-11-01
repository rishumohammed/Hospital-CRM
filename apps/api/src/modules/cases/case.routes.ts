import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import {
  caseFilterSchema,
  updateCaseSchema,
  consultationOutcomeSchema,
  advanceCaseStageSchema,
  Permissions,
} from '@hospital-crm/shared';
import {
  listCases,
  getCaseById,
  updateCase,
  recordConsultationOutcome,
  advanceCaseStage,
} from './case.service';
import { authenticate, requirePermission } from '../auth/auth.middleware';

export const caseRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // All case routes require authentication
  fastify.register(async (authGroup) => {
    authGroup.addHook('preHandler', authenticate);

    // 1. List Cases
    authGroup.get(
      '/cases',
      { preHandler: [requirePermission(Permissions.CASE_VIEW, 'case')] },
      async (req, reply) => {
        const parseResult = caseFilterSchema.safeParse(req.query);
        if (!parseResult.success) {
          return reply.status(400).send({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid case filter query',
              details: parseResult.error.format(),
            },
          });
        }

        const result = await listCases(parseResult.data, req.user!);
        return reply.send(result);
      }
    );

    // 2. Get Case By ID
    authGroup.get(
      '/cases/:id',
      { preHandler: [requirePermission(Permissions.CASE_VIEW, 'case')] },
      async (req, reply) => {
        const { id } = req.params as { id: string };
        const caseId = parseInt(id, 10);
        if (isNaN(caseId)) {
          return reply.status(400).send({
            error: { code: 'INVALID_ID', message: 'Case ID must be an integer' },
          });
        }

        const patientCase = await getCaseById(
          caseId,
          req.user!,
          req.ip,
          req.headers['user-agent']
        );
        return reply.send(patientCase);
      }
    );

    // 3. Update Case
    authGroup.patch(
      '/cases/:id',
      { preHandler: [requirePermission(Permissions.CASE_EDIT, 'case')] },
      async (req, reply) => {
        const { id } = req.params as { id: string };
        const caseId = parseInt(id, 10);
        if (isNaN(caseId)) {
          return reply.status(400).send({
            error: { code: 'INVALID_ID', message: 'Case ID must be an integer' },
          });
        }

        const parseResult = updateCaseSchema.safeParse(req.body);
        if (!parseResult.success) {
          return reply.status(400).send({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid update payload',
              details: parseResult.error.format(),
            },
          });
        }

        const updated = await updateCase(
          caseId,
          parseResult.data,
          req.user!,
          req.ip,
          req.headers['user-agent']
        );
        return reply.send(updated);
      }
    );

    // 4. Record Consultation Outcome
    authGroup.post(
      '/cases/:id/consultation-outcome',
      { preHandler: [requirePermission(Permissions.CASE_EDIT, 'case')] },
      async (req, reply) => {
        const { id } = req.params as { id: string };
        const caseId = parseInt(id, 10);
        if (isNaN(caseId)) {
          return reply.status(400).send({
            error: { code: 'INVALID_ID', message: 'Case ID must be an integer' },
          });
        }

        const parseResult = consultationOutcomeSchema.safeParse(req.body);
        if (!parseResult.success) {
          return reply.status(400).send({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid consultation outcome payload',
              details: parseResult.error.format(),
            },
          });
        }

        const result = await recordConsultationOutcome(
          caseId,
          parseResult.data,
          req.user!,
          req.ip,
          req.headers['user-agent']
        );
        return reply.send(result);
      }
    );

    // 5. Advance Case Stage
    authGroup.post(
      '/cases/:id/advance-stage',
      { preHandler: [requirePermission(Permissions.CASE_EDIT, 'case')] },
      async (req, reply) => {
        const { id } = req.params as { id: string };
        const caseId = parseInt(id, 10);
        if (isNaN(caseId)) {
          return reply.status(400).send({
            error: { code: 'INVALID_ID', message: 'Case ID must be an integer' },
          });
        }

        const parseResult = advanceCaseStageSchema.safeParse(req.body);
        if (!parseResult.success) {
          return reply.status(400).send({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid advance stage payload',
              details: parseResult.error.format(),
            },
          });
        }

        const result = await advanceCaseStage(
          caseId,
          parseResult.data,
          req.user!,
          req.ip,
          req.headers['user-agent']
        );
        return reply.send(result);
      }
    );
  });
};
