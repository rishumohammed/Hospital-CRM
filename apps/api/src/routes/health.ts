import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../database/client';
import { resetAllTestData, clearOperationalData } from '../modules/settings/settings.service';

export const healthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/health/reset-data', async (_request, reply) => {
    const result = await resetAllTestData();
    return reply.send(result);
  });

  fastify.get('/health/reset-data', async (_request, reply) => {
    const result = await resetAllTestData();
    return reply.send(result);
  });

  fastify.post('/health/clear-operational-data', async (_request, reply) => {
    const result = await clearOperationalData();
    return reply.send(result);
  });

  fastify.get('/health/clear-operational-data', async (_request, reply) => {
    const result = await clearOperationalData();
    return reply.send(result);
  });

  fastify.get(
    '/health',
    {
      schema: {
        description: 'Health check endpoint',
        tags: ['System'],
        response: {
          200: {
            type: 'object',
            properties: {
              status: { type: 'string' },
              uptime: { type: 'number' },
              timestamp: { type: 'string' },
              database: { type: 'string' },
            },
          },
        },
      },
    },
    async (_request, reply) => {
      let dbStatus = 'connected';
      try {
        await prisma.$queryRaw`SELECT 1`;
      } catch (err) {
        dbStatus = 'disconnected';
        fastify.log.error({ err }, 'Health check failed database ping');
        return reply.status(503).send({
          status: 'error',
          uptime: process.uptime(),
          timestamp: new Date().toISOString(),
          database: dbStatus,
        });
      }

      return reply.send({
        status: 'ok',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        database: dbStatus,
      });
    }
  );
};
