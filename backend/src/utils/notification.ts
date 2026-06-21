import prisma from '../config/db';

export interface NotificationPayload {
  id: string;
  type: string;
  title: string;
  message: string;
  taskId?: string;
  projectId?: string;
  workspaceId?: string;
  createdAt: string;
  read: boolean;
  actor: {
    id: string;
    name: string;
    avatar: string | null;
  };
}

export const makeNotif = (
  id: string,
  type: string,
  title: string,
  message: string,
  actor: { id: string; name: string; avatar: string | null },
  taskId?: string,
  projectId?: string,
  workspaceId?: string,
): NotificationPayload => ({
  id,
  type,
  title,
  message,
  taskId,
  projectId,
  workspaceId,
  createdAt: new Date().toISOString(),
  read: false,
  actor,
});

export const getUserInfo = async (userId: string): Promise<{ id: string; name: string; avatar: string | null }> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, avatarUrl: true },
  });
  return {
    id: userId,
    name: user?.name || userId,
    avatar: user?.avatarUrl || null,
  };
};
