import { useEffect } from 'react';
import { getSocket } from '../services/socket';
import { useAuthStore } from '../store/authStore';

export function useProjectRoom(projectId: string | undefined) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (!projectId || !isAuthenticated) return;

    const socket = getSocket();
    if (!socket) return;

    socket.emit('join:project', { projectId });

    return () => {
      socket.emit('leave:project', { projectId });
    };
  }, [projectId, isAuthenticated]);
}

export function useTaskViewing(projectId: string | undefined, taskId: string | undefined) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const userName = useAuthStore((s) => s.user?.name);

  useEffect(() => {
    if (!projectId || !taskId || !isAuthenticated) return;

    const socket = getSocket();
    if (!socket) return;

    socket.emit('viewing:task:start', { projectId, taskId, userName });

    return () => {
      socket.emit('viewing:task:stop', { projectId, taskId });
    };
  }, [projectId, taskId, isAuthenticated, userName]);
}
