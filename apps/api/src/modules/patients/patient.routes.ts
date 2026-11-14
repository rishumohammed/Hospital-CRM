import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { listPatients, getPatientDossier } from './patient.service';
import { authenticate, requirePermission } from '../auth/auth.middleware';
import { Permissions } from '@hospital-crm/shared';

export const patientRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.register(async (authGroup) => {
    authGroup.addHook('preHandler', authenticate);

    // 1. List Patients (Centralized Directory)
    authGroup.get(
      '/patients',
      { preHandler: [requirePermission([Permissions.CASE_VIEW, Permissions.VISIT_VIEW, Permissions.LEAD_VIEW], 'case')] },
      async (req, reply) => {
        const query = req.query as any;
        const result = await listPatients(
          {
            search: query.search,
            branchId: query.branchId ? Number(query.branchId) : undefined,
            careStatus: query.careStatus,
            page: query.page ? Number(query.page) : 1,
            pageSize: query.pageSize ? Number(query.pageSize) : 20,
          },
          req.user!
        );
        return reply.send(result);
      }
    );

    // 2. Get Comprehensive Lifetime Patient Dossier
    authGroup.get(
      '/patients/:id',
      { preHandler: [requirePermission([Permissions.CASE_VIEW, Permissions.VISIT_VIEW, Permissions.LEAD_VIEW], 'case')] },
      async (req, reply) => {
        const { id } = req.params as { id: string };
        const patientId = parseInt(id, 10);
        if (isNaN(patientId)) {
          return reply.status(400).send({
            error: { code: 'INVALID_ID', message: 'Patient ID must be an integer' },
          });
        }

        const dossier = await getPatientDossier(patientId, req.user!);
        return reply.send(dossier);
      }
    );
  });
};

