import { useState, useEffect, useCallback, useRef } from 'react';
import { getSocket } from '../services/socket';
import { useAuthStore } from '../store/authStore';

interface TypingUser {
  userId: string;
  userName: string;
  avatarUrl?: string | null;
}

export function useTypingIndicator(projectId: string, taskId: string) {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const currentUserId = useAuthStore((s) => s.user?.id);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleTyping = (payload: { taskId: string; userId: string; userName: string; avatarUrl?: string | null; isTyping: boolean }) => {
      if (payload.taskId !== taskId) return;
      if (payload.userId === currentUserId) return;

      if (payload.isTyping) {
        setTypingUsers((prev) => {
          if (prev.some((u) => u.userId === payload.userId)) return prev;
          return [...prev, { userId: payload.userId, userName: payload.userName, avatarUrl: payload.avatarUrl }];
        });

        const existing = timersRef.current.get(payload.userId);
        if (existing) clearTimeout(existing);

        const timer = setTimeout(() => {
          setTypingUsers((prev) => prev.filter((u) => u.userId !== payload.userId));
          timersRef.current.delete(payload.userId);
        }, 3000);
        timersRef.current.set(payload.userId, timer);
      } else {
        setTypingUsers((prev) => prev.filter((u) => u.userId !== payload.userId));
        const existing = timersRef.current.get(payload.userId);
        if (existing) {
          clearTimeout(existing);
          timersRef.current.delete(payload.userId);
        }
      }
    };

    socket.on('user:typing', handleTyping);

    return () => {
      socket.off('user:typing', handleTyping);
      timersRef.current.forEach((t) => clearTimeout(t));
      timersRef.current.clear();
    };
  }, [taskId, currentUserId]);

  const emitTyping = useCallback((isTyping: boolean) => {
    const sock = getSocket();
    if (!sock || !currentUserId) return;

    const authUser = useAuthStore.getState().user;
    const event = isTyping ? 'typing:start' : 'typing:stop';
    sock.emit(event, {
      projectId,
      taskId,
      userName: authUser?.name || 'Unknown',
      avatarUrl: authUser?.avatarUrl,
    });
  }, [projectId, taskId, currentUserId]);

  return { typingUsers, emitTyping };
}
