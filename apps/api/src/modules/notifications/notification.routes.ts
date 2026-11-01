import { FastifyPluginAsync } from 'fastify';
import { authenticate } from '../auth/auth.middleware';
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from './notification.service';

export const notificationRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authenticate);

  fastify.get(
    '/',
    {
      schema: {
        description: 'Get notifications for current user with unread count',
        tags: ['Notifications'],
        querystring: {
          type: 'object',
          properties: {
            unreadOnly: { type: 'boolean' },
          },
        },
      },
    },
    async (request, reply) => {
      const query = request.query as any;
      const unreadOnly = query.unreadOnly === true || query.unreadOnly === 'true';
      const result = await getNotifications(request.user!, unreadOnly);
      return reply.send(result);
    }
  );

  fastify.post(
    '/:id/read',
    {
      schema: {
        description: 'Mark notification as read',
        tags: ['Notifications'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'number' },
          },
          required: ['id'],
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const updated = await markNotificationAsRead(Number(id), request.user!);
      return reply.send(updated);
    }
  );

  fastify.post(
    '/read-all',
    {
      schema: {
        description: 'Mark all notifications as read',
        tags: ['Notifications'],
      },
    },
    async (request, reply) => {
      const result = await markAllNotificationsAsRead(request.user!);
      return reply.send(result);
    }
  );
};
