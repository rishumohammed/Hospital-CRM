import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../database/client';

export const healthRoutes: FastifyPluginAsync = async (fastify) => {
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
