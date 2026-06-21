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

    const invalidateAnalytics = () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.analytics.all });
    };

    const invalidateTasks = () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.tasks.all });
    };

    const invalidateProjects = () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.projects.all });
    };

    const handleProjectCreated = () => {
      invalidateProjects();
      invalidateAnalytics();
    };

    const handleProjectUpdated = () => {
      invalidateProjects();
      invalidateAnalytics();
    };

    const handleProjectDeleted = () => {
      invalidateProjects();
      invalidateAnalytics();
    };

    const handleProjectArchived = () => {
      invalidateProjects();
      invalidateAnalytics();
    };

    const handleProjectUnarchived = () => {
      invalidateProjects();
      invalidateAnalytics();
    };

    const handleTaskCreated = () => {
      invalidateTasks();
      invalidateProjects();
      invalidateAnalytics();
    };

    const handleTaskUpdated = () => {
      invalidateTasks();
      invalidateProjects();
      invalidateAnalytics();
    };

    const handleTaskDeleted = () => {
      invalidateTasks();
      invalidateProjects();
      invalidateAnalytics();
    };

    const handleTaskAssigned = () => {
      invalidateTasks();
      invalidateProjects();
      invalidateAnalytics();
    };

    const handleCommentAdded = () => {
      invalidateTasks();
      invalidateAnalytics();
    };

    const handleCommentDeleted = () => {
      invalidateTasks();
      invalidateAnalytics();
    };

    const handleAttachmentUploaded = () => {
      invalidateTasks();
      invalidateAnalytics();
    };

    const handleAttachmentDeleted = () => {
      invalidateTasks();
      invalidateAnalytics();
    };

    const handleMemberAdded = () => {
      invalidateAnalytics();
    };

    const handleMemberRemoved = () => {
      invalidateAnalytics();
    };

    socket.on('notification', handleNotification);
    socket.on('project:created', handleProjectCreated);
    socket.on('project:updated', handleProjectUpdated);
    socket.on('project:deleted', handleProjectDeleted);
    socket.on('project:archived', handleProjectArchived);
    socket.on('project:unarchived', handleProjectUnarchived);
    socket.on('task:created', handleTaskCreated);
    socket.on('task:updated', handleTaskUpdated);
    socket.on('task:deleted', handleTaskDeleted);
    socket.on('task:assigned', handleTaskAssigned);
    socket.on('comment:added', handleCommentAdded);
    socket.on('comment:deleted', handleCommentDeleted);
    socket.on('attachment:uploaded', handleAttachmentUploaded);
    socket.on('attachment:deleted', handleAttachmentDeleted);
    socket.on('member:added', handleMemberAdded);
    socket.on('member:removed', handleMemberRemoved);

    return () => {
      socket.off('notification', handleNotification);
      socket.off('project:created', handleProjectCreated);
      socket.off('project:updated', handleProjectUpdated);
      socket.off('project:deleted', handleProjectDeleted);
      socket.off('project:archived', handleProjectArchived);
      socket.off('project:unarchived', handleProjectUnarchived);
      socket.off('task:created', handleTaskCreated);
      socket.off('task:updated', handleTaskUpdated);
      socket.off('task:deleted', handleTaskDeleted);
      socket.off('task:assigned', handleTaskAssigned);
      socket.off('comment:added', handleCommentAdded);
      socket.off('comment:deleted', handleCommentDeleted);
      socket.off('attachment:uploaded', handleAttachmentUploaded);
      socket.off('attachment:deleted', handleAttachmentDeleted);
      socket.off('member:added', handleMemberAdded);
      socket.off('member:removed', handleMemberRemoved);
    };
  }, [isAuthenticated, queryClient, addNotification]);
}
