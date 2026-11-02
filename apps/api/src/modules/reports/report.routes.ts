import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { Permissions } from '@hospital-crm/shared';
import {
  getAdmissionReport,
  getAftercareReport,
  getSupportReport,
  getLostReasonsReport,
  getSourceQualityReport,
  getTreatmentFollowupReport,
  getAdherenceReport,
  getMissedReasonsReport,
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

    // Treatment Follow-up Manager Dashboard Report
    authGroup.get(
      '/reports/treatment-followup',
      { preHandler: [requirePermission(Permissions.FOLLOWUP_REPORT, 'case')] },
      async (req, reply) => {
        const query = req.query as {
          branchId?: string;
          doctorId?: string;
          therapyId?: string;
          from?: string;
          to?: string;
        };

        const result = await getTreatmentFollowupReport(
          {
            branchId: query.branchId ? parseInt(query.branchId, 10) : undefined,
            doctorId: query.doctorId ? parseInt(query.doctorId, 10) : undefined,
            therapyId: query.therapyId ? parseInt(query.therapyId, 10) : undefined,
            from: query.from,
            to: query.to,
          },
          req.user!
        );

        return reply.send(result);
      }
    );

    // Adherence Report
    authGroup.get(
      '/reports/adherence',
      { preHandler: [requirePermission(Permissions.FOLLOWUP_REPORT, 'case')] },
      async (req, reply) => {
        const query = req.query as {
          branchId?: string;
          doctorId?: string;
          risk?: string;
          from?: string;
          to?: string;
        };

        const result = await getAdherenceReport(
          {
            branchId: query.branchId ? parseInt(query.branchId, 10) : undefined,
            doctorId: query.doctorId ? parseInt(query.doctorId, 10) : undefined,
            risk: query.risk,
            from: query.from,
            to: query.to,
          },
          req.user!
        );

        return reply.send(result);
      }
    );

    // Missed Reasons Report
    authGroup.get(
      '/reports/missed-reasons',
      { preHandler: [requirePermission(Permissions.FOLLOWUP_REPORT, 'case')] },
      async (req, reply) => {
        const query = req.query as {
          branchId?: string;
          therapyId?: string;
          from?: string;
          to?: string;
        };

        const result = await getMissedReasonsReport(
          {
            branchId: query.branchId ? parseInt(query.branchId, 10) : undefined,
            therapyId: query.therapyId ? parseInt(query.therapyId, 10) : undefined,
            from: query.from,
            to: query.to,
          },
          req.user!
        );

        return reply.send(result);
      }
    );
  });
};

