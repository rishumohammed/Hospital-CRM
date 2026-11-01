import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import {
  Permissions,
  requestExportSchema,
  approveExportSchema,
} from '@hospital-crm/shared';
import {
  requestExport,
  listExports,
  approveExport,
  generateWatermarkedCsv,
} from './export.service';
import { authenticate, requirePermission } from '../auth/auth.middleware';

export const exportRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.register(async (authGroup) => {
    authGroup.addHook('preHandler', authenticate);

    // 1. Request an Export
    authGroup.post(
      '/exports',
      { preHandler: [requirePermission(Permissions.EXPORT_REQUEST)] },
      async (req, reply) => {
        const parseResult = requestExportSchema.safeParse(req.body);
        if (!parseResult.success) {
          return reply.status(400).send({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid export request payload',
              details: parseResult.error.format(),
            },
          });
        }

        const result = await requestExport(
          req.user!,
          parseResult.data,
          req.ip,
          req.headers['user-agent']
        );
        return reply.status(201).send(result);
      }
    );

    // 2. List Exports
    authGroup.get(
      '/exports',
      { preHandler: [requirePermission(Permissions.EXPORT_REQUEST)] },
      async (req, reply) => {
        const query = req.query as { status?: string };
        const exports = await listExports(req.user!, query);
        return reply.send({ data: exports });
      }
    );

    // 3. Approve / Reject Export Request
    authGroup.post(
      '/exports/:id/approve',
      { preHandler: [requirePermission(Permissions.EXPORT_APPROVE)] },
      async (req, reply) => {
        const { id } = req.params as { id: string };
        const exportId = parseInt(id, 10);
        if (isNaN(exportId)) {
          return reply.status(400).send({
            error: { code: 'INVALID_ID', message: 'Export ID must be an integer' },
          });
        }

        const parseResult = approveExportSchema.safeParse(req.body);
        if (!parseResult.success) {
          return reply.status(400).send({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid approval payload',
              details: parseResult.error.format(),
            },
          });
        }

        const result = await approveExport(
          req.user!,
          exportId,
          parseResult.data,
          req.ip,
          req.headers['user-agent']
        );
        return reply.send(result);
      }
    );

    // 4. Download Watermarked CSV
    authGroup.get(
      '/exports/:id/download',
      { preHandler: [requirePermission(Permissions.EXPORT_REQUEST)] },
      async (req, reply) => {
        const { id } = req.params as { id: string };
        const exportId = parseInt(id, 10);
        if (isNaN(exportId)) {
          return reply.status(400).send({
            error: { code: 'INVALID_ID', message: 'Export ID must be an integer' },
          });
        }

        const { filename, csv } = await generateWatermarkedCsv(
          req.user!,
          exportId,
          req.ip,
          req.headers['user-agent']
        );

        reply.header('Content-Type', 'text/csv; charset=utf-8');
        reply.header('Content-Disposition', `attachment; filename="${filename}"`);
        return reply.send(csv);
      }
    );
  });
};
