import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';

export async function createNotification(params: {
  title: string;
  message: string;
  type?: 'INFO' | 'UPDATE' | 'SECURITY' | 'SCAN' | 'WARNING';
  link?: string;
}) {
  try {
    const notif = await prisma.notification.create({
      data: {
        title: params.title,
        message: params.message,
        type: params.type || 'INFO',
        link: params.link || null,
      },
    });
    logger.info('Notification created', { id: notif.id, title: params.title });
    return notif;
  } catch (err: any) {
    logger.error('Failed to create notification', { error: err.message });
  }
}

export async function listNotifications(onlyUnread = false) {
  const where = onlyUnread ? { isRead: false } : {};
  const [items, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.notification.count({ where: { isRead: false } }),
  ]);

  return { items, unreadCount };
}

export async function markNotificationAsRead(id: string) {
  return prisma.notification.update({
    where: { id },
    data: { isRead: true },
  });
}

export async function markAllNotificationsAsRead() {
  return prisma.notification.updateMany({
    where: { isRead: false },
    data: { isRead: true },
  });
}

export async function deleteNotification(id: string) {
  return prisma.notification.delete({
    where: { id },
  });
}
