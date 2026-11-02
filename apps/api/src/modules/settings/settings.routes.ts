import { FastifyPluginAsync } from 'fastify';
import { Permissions } from '@hospital-crm/shared';
import { prisma } from '../../database/client';
import { authenticate, requirePermission } from '../auth/auth.middleware';
import { getAllSettings, getSetting, resetAllTestData } from './settings.service';
import { logAudit } from '../audit/audit.service';

export const settingsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authenticate);

  // Reset all transactional CRM test data (requires settings.manage or admin)
  fastify.post(
    '/settings/reset-test-data',
    { preHandler: [requirePermission(Permissions.SETTINGS_MANAGE)] },
    async (_request, reply) => {
      const result = await resetAllTestData();
      return reply.send(result);
    }
  );

  // Get all settings
  fastify.get('/settings', async (_request, reply) => {
    const settings = await getAllSettings();
    return reply.send(settings);
  });

  // Get single setting
  fastify.get('/settings/:key', async (request, reply) => {
    const { key } = request.params as { key: string };
    const value = await getSetting(key);
    return reply.send({ key, value });
  });

  // Update setting (requires settings.manage)
  fastify.patch(
    '/settings/:key',
    { preHandler: [requirePermission(Permissions.SETTINGS_MANAGE)] },
    async (request, reply) => {
      const { key } = request.params as { key: string };
      const { value } = request.body as { value: any };

      if (!value || typeof value !== 'object') {
        return reply.status(400).send({
          error: { code: 'INVALID_VALUE', message: 'Value must be a valid JSON object' },
        });
      }

      const existing = await prisma.setting.findUnique({ where: { key } });

      const updated = await prisma.setting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });

      await logAudit(prisma, {
        userId: request.user!.id,
        action: 'SETTING_UPDATED',
        entity: 'setting',
        entityId: updated.id,
        before: existing ? (existing.value as any) : null,
        after: value,
        req: request,
      });

      return reply.send(updated);
    }
  );
};
