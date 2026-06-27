import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { notificationApi } from '../services/notifications';

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  taskId?: string;
  projectId?: string;
  workspaceId?: string;
  read: boolean;
  createdAt: string;
  actor?: {
    id: string;
    name: string;
    avatar: string | null;
  };
}

interface NotificationState {
  notifications: AppNotification[];
  badgeCount: number;
  loading: boolean;
  setNotifications: (notifications: AppNotification[]) => void;
  addNotification: (notification: AppNotification) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  fetchNotifications: (page?: number) => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  clearBadge: () => void;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      notifications: [],
      badgeCount: 0,
      loading: false,

      setNotifications: (notifications) =>
        set({ notifications, badgeCount: notifications.filter((n) => !n.read).length }),

      addNotification: (notification) => {
        set((state) => {
          const exists = state.notifications.some((n) => n.id === notification.id);
          if (exists) return state;
          return {
            notifications: [notification, ...state.notifications],
            badgeCount: state.badgeCount + 1,
          };
        });
      },

      markAsRead: (id) => {
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
          badgeCount: Math.max(0, state.badgeCount - 1),
        }));
        notificationApi.markAsRead(id).catch(() => {});
      },

      markAllAsRead: () => {
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
          badgeCount: 0,
        }));
        notificationApi.markAllAsRead().catch(() => {});
      },

      deleteNotification: (id) => {
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
          badgeCount: Math.max(0, state.badgeCount - (state.notifications.find((n) => n.id === id)?.read ? 0 : 1)),
        }));
        notificationApi.delete(id).catch(() => {});
      },

      fetchNotifications: async (page = 1) => {
        set({ loading: true });
        try {
          const result = await notificationApi.list(page, 20);
          set((state) => {
            const existingIds = new Set(state.notifications.map((n) => n.id));
            const newNotifs = result.notifications.filter((n) => !existingIds.has(n.id));
            return {
              notifications: page === 1
                ? result.notifications
                : [...state.notifications, ...newNotifs],
              badgeCount: result.unreadCount,
              loading: false,
            };
          });
        } catch {
          set({ loading: false });
        }
      },

      fetchUnreadCount: async () => {
        try {
          const count = await notificationApi.getUnreadCount();
          set({ badgeCount: count });
        } catch {}
      },

      clearBadge: () => set({ badgeCount: 0 }),
    }),
    {
      name: 'synapse-notifications',
      storage: createJSONStorage(() => AsyncStorage),
      skipHydration: true,
      partialize: (state) => ({ notifications: state.notifications }),
    }
  )
);
