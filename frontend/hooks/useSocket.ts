import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { useNotificationStore, AppNotification } from '../store/notificationStore';
import { connectSocket, disconnectSocket, getSocket } from '../services/socket';
import { QueryKeys } from '../constants/queryKeys';

export function useSocketEvents() {
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const addNotification = useNotificationStore((s) => s.addNotification);
  const initialized = useRef(false);

  useEffect(() => {
    if (!isAuthenticated) {
      if (initialized.current) {
        disconnectSocket();
        initialized.current = false;
      }
      return;
    }

    if (initialized.current) return;
    initialized.current = true;

    const socket = connectSocket();

    const handleNotification = (notification: AppNotification) => {
      addNotification(notification);
    };

    const handleProjectCreated = () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.projects.all });
    };

    const handleProjectUpdated = () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.projects.all });
    };

    const handleProjectDeleted = () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.projects.all });
    };

    const handleTaskCreated = () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.tasks.all });
      queryClient.invalidateQueries({ queryKey: QueryKeys.projects.all });
    };

    const handleTaskUpdated = () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.tasks.all });
      queryClient.invalidateQueries({ queryKey: QueryKeys.projects.all });
    };

    const handleTaskDeleted = () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.tasks.all });
      queryClient.invalidateQueries({ queryKey: QueryKeys.projects.all });
    };

    const handleCommentAdded = () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.tasks.all });
    };

    const handleCommentDeleted = () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.tasks.all });
    };

    socket.on('notification', handleNotification);
    socket.on('project:created', handleProjectCreated);
    socket.on('project:updated', handleProjectUpdated);
    socket.on('project:deleted', handleProjectDeleted);
    socket.on('task:created', handleTaskCreated);
    socket.on('task:updated', handleTaskUpdated);
    socket.on('task:deleted', handleTaskDeleted);
    socket.on('comment:added', handleCommentAdded);
    socket.on('comment:deleted', handleCommentDeleted);

    return () => {
      socket.off('notification', handleNotification);
      socket.off('project:created', handleProjectCreated);
      socket.off('project:updated', handleProjectUpdated);
      socket.off('project:deleted', handleProjectDeleted);
      socket.off('task:created', handleTaskCreated);
      socket.off('task:updated', handleTaskUpdated);
      socket.off('task:deleted', handleTaskDeleted);
      socket.off('comment:added', handleCommentAdded);
      socket.off('comment:deleted', handleCommentDeleted);
    };
  }, [isAuthenticated, queryClient, addNotification]);
}
