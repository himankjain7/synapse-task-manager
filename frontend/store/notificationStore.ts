import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type NotificationType = 'task_assigned' | 'comment_mention' | 'due_soon' | 'workspace_invite';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, string>;
  read: boolean;
  createdAt: string;
}

interface NotificationState {
  notifications: AppNotification[];
  badgeCount: number;
  setNotifications: (notifications: AppNotification[]) => void;
  addNotification: (notification: AppNotification) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearBadge: () => void;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      notifications: [],
      badgeCount: 0,
      setNotifications: (notifications) =>
        set({ notifications, badgeCount: notifications.filter((n) => !n.read).length }),
      addNotification: (notification) =>
        set((state) => ({
          notifications: [notification, ...state.notifications],
          badgeCount: state.badgeCount + 1,
        })),
      markAsRead: (id) =>
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
          badgeCount: Math.max(0, state.badgeCount - 1),
        })),
      markAllAsRead: () =>
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
          badgeCount: 0,
        })),
      clearBadge: () => set({ badgeCount: 0 }),
    }),
    {
      name: 'synapse-notifications',
      storage: createJSONStorage(() => AsyncStorage),
      skipHydration: true,
    }
  )
);
