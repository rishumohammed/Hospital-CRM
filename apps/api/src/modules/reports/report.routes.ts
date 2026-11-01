import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { Permissions } from '@hospital-crm/shared';
import { getAdmissionReport } from './report.service';
import { authenticate, requirePermission } from '../auth/auth.middleware';

export const reportRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.register(async (authGroup) => {
    authGroup.addHook('preHandler', authenticate);

    // Admission Desk Report
    authGroup.get(
      '/reports/admission',
      { preHandler: [requirePermission(Permissions.REPORT_VIEW, 'report')] },
      async (req, reply) => {
        const query = req.query as {
          branchId?: string;
          startDate?: string;
          endDate?: string;
        };

        const branchId = query.branchId ? parseInt(query.branchId, 10) : undefined;
        const result = await getAdmissionReport(
          {
            branchId,
            startDate: query.startDate,
            endDate: query.endDate,
          },
          req.user!
        );

        return reply.send(result);
      }
    );
  });
};
