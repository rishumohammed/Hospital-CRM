import { prisma } from '../../database/client';
import { UserContext } from '../rbac/scope';

/**
 * Gets notifications for the user with unread count.
 */
export async function getNotifications(user: UserContext, unreadOnly = false) {
  const where: any = {
    userId: user.id,
    ...(unreadOnly ? { readAt: null } : {}),
  };

  const [unreadCount, notifications] = await Promise.all([
    prisma.notification.count({
      where: { userId: user.id, readAt: null },
    }),
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
  ]);

  return {
    unreadCount,
    data: notifications,
  };
}

/**
 * Marks a notification as read.
 */
export async function markNotificationAsRead(notificationId: number, user: UserContext) {
  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, userId: user.id },
  });

  if (!notification) {
    throw { statusCode: 404, code: 'NOT_FOUND', message: 'Notification not found' };
  }

  const updated = await prisma.notification.update({
    where: { id: notificationId },
    data: { readAt: new Date() },
  });

  return updated;
}

/**
 * Marks all notifications for user as read.
 */
export async function markAllNotificationsAsRead(user: UserContext) {
  const result = await prisma.notification.updateMany({
    where: { userId: user.id, readAt: null },
    data: { readAt: new Date() },
  });

  return { count: result.count };
}
