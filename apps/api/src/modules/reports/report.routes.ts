import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { Permissions } from '@hospital-crm/shared';
import {
  getAdmissionReport,
  getAftercareReport,
  getSupportReport,
  getLostReasonsReport,
  getSourceQualityReport,
} from './report.service';
import { authenticate, requirePermission } from '../auth/auth.middleware';

export const reportRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.register(async (authGroup) => {
    authGroup.addHook('preHandler', authenticate);

    // Support Desk Report
    authGroup.get(
      '/reports/support',
      { preHandler: [requirePermission(Permissions.REPORT_VIEW, 'report')] },
      async (req, reply) => {
        const query = req.query as {
          branchId?: string;
          startDate?: string;
          endDate?: string;
        };

        const branchId = query.branchId ? parseInt(query.branchId, 10) : undefined;
        const result = await getSupportReport(
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

    // Aftercare Desk Report
    authGroup.get(
      '/reports/aftercare',
      { preHandler: [requirePermission(Permissions.REPORT_VIEW, 'report')] },
      async (req, reply) => {
        const query = req.query as {
          branchId?: string;
          startDate?: string;
          endDate?: string;
        };

        const branchId = query.branchId ? parseInt(query.branchId, 10) : undefined;
        const result = await getAftercareReport(
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

    // Lost Reasons Report
    authGroup.get(
      '/reports/lost-reasons',
      { preHandler: [requirePermission(Permissions.REPORT_VIEW, 'report')] },
      async (req, reply) => {
        const query = req.query as {
          branchId?: string;
          startDate?: string;
          endDate?: string;
        };

        const branchId = query.branchId ? parseInt(query.branchId, 10) : undefined;
        const result = await getLostReasonsReport(
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

    // Source Quality Report
    authGroup.get(
      '/reports/source-quality',
      { preHandler: [requirePermission(Permissions.REPORT_VIEW, 'report')] },
      async (req, reply) => {
        const query = req.query as {
          branchId?: string;
          startDate?: string;
          endDate?: string;
        };

        const branchId = query.branchId ? parseInt(query.branchId, 10) : undefined;
        const result = await getSourceQualityReport(
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

