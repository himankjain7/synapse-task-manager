import prisma from '../config/db';
import { getIo } from '../socket';
import { v4 as uuidv4 } from 'uuid';
import { Prisma } from '@prisma/client';

interface ActorInfo {
  id: string;
  name: string;
  avatar: string | null;
}

interface NotifyParams {
  recipientId: string;
  actorId: string;
  type: string;
  title: string;
  message: string;
  workspaceId?: string;
  projectId?: string;
  taskId?: string;
  metadata?: Record<string, unknown>;
  skipSelf?: boolean;
  dedupKey?: string;
}

interface NotificationPayload {
  id: string;
  type: string;
  title: string;
  message: string;
  taskId?: string;
  projectId?: string;
  workspaceId?: string;
  read: boolean;
  createdAt: string;
  actor: ActorInfo;
}

export class NotificationService {
  private static dedupCache = new Map<string, number>();

  private static makeDedupKey(params: NotifyParams): string {
    return params.dedupKey || `${params.recipientId}:${params.type}:${params.taskId || ''}:${params.projectId || ''}`;
  }

  private static isDuplicate(params: NotifyParams): boolean {
    const key = this.makeDedupKey(params);
    const lastTime = this.dedupCache.get(key);
    const now = Date.now();
    if (lastTime && now - lastTime < 10_000) {
      return true;
    }
    this.dedupCache.set(key, now);
    if (this.dedupCache.size > 1000) {
      const cutoff = now - 30_000;
      for (const [k, v] of this.dedupCache) {
        if (v < cutoff) this.dedupCache.delete(k);
      }
    }
    return false;
  }

  static async getUserInfo(userId: string): Promise<ActorInfo> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, avatarUrl: true },
    });
    return {
      id: userId,
      name: user?.name || 'Unknown',
      avatar: user?.avatarUrl || null,
    };
  }

  static async notify(params: NotifyParams): Promise<NotificationPayload | null> {
    try {
      if (params.skipSelf !== false && params.recipientId === params.actorId) {
        return null;
      }

      if (this.isDuplicate(params)) {
        return null;
      }

      const actor = await this.getUserInfo(params.actorId);

      const notification = await prisma.notification.create({
        data: {
          id: uuidv4(),
          recipientId: params.recipientId,
          actorId: params.actorId,
          workspaceId: params.workspaceId || null,
          projectId: params.projectId || null,
          taskId: params.taskId || null,
          type: params.type,
          title: params.title,
          message: params.message,
          metadata: params.metadata as Prisma.InputJsonValue | undefined,
          isRead: false,
          createdAt: new Date(),
        },
      });

      const payload: NotificationPayload = {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        taskId: notification.taskId || undefined,
        projectId: notification.projectId || undefined,
        workspaceId: notification.workspaceId || undefined,
        read: notification.isRead,
        createdAt: notification.createdAt.toISOString(),
        actor,
      };

      const io = getIo();
      io.to(`user:${params.recipientId}`).emit('notification', payload);

      return payload;
    } catch (error) {
      console.error('[NotificationService] Failed to send notification:', error);
      return null;
    }
  }

  static async notifyMany(
    recipients: string[],
    params: Omit<NotifyParams, 'recipientId'>
  ): Promise<NotificationPayload[]> {
    const results: NotificationPayload[] = [];
    for (const recipientId of recipients) {
      const result = await this.notify({ ...params, recipientId });
      if (result) results.push(result);
    }
    return results;
  }

  static async getNotifications(
    userId: string,
    options: { page?: number; limit?: number; unreadOnly?: boolean } = {}
  ): Promise<{ notifications: NotificationPayload[]; total: number; unreadCount: number; page: number; limit: number }> {
    const page = options.page || 1;
    const limit = Math.min(options.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where: any = { recipientId: userId };
    if (options.unreadOnly) {
      where.isRead = false;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { recipientId: userId, isRead: false } }),
    ]);

    const actorIds = [...new Set(notifications.map(n => n.actorId).filter(Boolean) as string[])];
    const actorMap = new Map<string, ActorInfo>();
    if (actorIds.length > 0) {
      const actors = await prisma.user.findMany({
        where: { id: { in: actorIds } },
        select: { id: true, name: true, avatarUrl: true },
      });
      for (const a of actors) {
        actorMap.set(a.id, { id: a.id, name: a.name, avatar: a.avatarUrl });
      }
    }

    const payloads: NotificationPayload[] = notifications.map(n => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      taskId: n.taskId || undefined,
      projectId: n.projectId || undefined,
      workspaceId: n.workspaceId || undefined,
      read: n.isRead,
      createdAt: n.createdAt.toISOString(),
      actor: n.actorId && actorMap.get(n.actorId)
        ? actorMap.get(n.actorId)!
        : { id: n.actorId || '', name: 'System', avatar: null },
    }));

    return { notifications: payloads, total, unreadCount, page, limit };
  }

  static async markAsRead(notificationId: string, userId: string): Promise<void> {
    await prisma.notification.updateMany({
      where: { id: notificationId, recipientId: userId },
      data: { isRead: true },
    });
  }

  static async markAllAsRead(userId: string): Promise<void> {
    await prisma.notification.updateMany({
      where: { recipientId: userId, isRead: false },
      data: { isRead: true },
    });
  }

  static async deleteNotification(notificationId: string, userId: string): Promise<boolean> {
    const result = await prisma.notification.deleteMany({
      where: { id: notificationId, recipientId: userId },
    });
    return result.count > 0;
  }

  static async clearAll(userId: string): Promise<void> {
    await prisma.notification.deleteMany({
      where: { recipientId: userId },
    });
  }

  static async getUnreadCount(userId: string): Promise<number> {
    return prisma.notification.count({
      where: { recipientId: userId, isRead: false },
    });
  }
}
