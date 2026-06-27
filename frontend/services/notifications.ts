import api from './api';
import { AppNotification } from '../store/notificationStore';

interface NotificationsResponse {
  notifications: AppNotification[];
  total: number;
  unreadCount: number;
  page: number;
  limit: number;
}

export const notificationApi = {
  list: async (page = 1, limit = 20, unreadOnly = false): Promise<NotificationsResponse> => {
    const response = await api.get('/api/v1/notifications', {
      params: { page, limit, unread: unreadOnly },
    });
    return response.data.data;
  },

  getUnreadCount: async (): Promise<number> => {
    const response = await api.get('/api/v1/notifications/unread-count');
    return response.data.data.count;
  },

  markAsRead: async (id: string): Promise<void> => {
    await api.patch(`/api/v1/notifications/${id}/read`);
  },

  markAllAsRead: async (): Promise<void> => {
    await api.patch('/api/v1/notifications/read-all');
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/api/v1/notifications/${id}`);
  },

  clearAll: async (): Promise<void> => {
    await api.delete('/api/v1/notifications/clear/all');
  },
};
