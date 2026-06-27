import { create } from 'zustand';

interface PresenceState {
  onlineUsers: Record<string, string[]>;
  viewersByTask: Record<string, { userId: string; userName: string }[]>;
  setOnlineUsers: (projectId: string, userIds: string[]) => void;
  addOnlineUser: (projectId: string, userId: string) => void;
  removeOnlineUser: (projectId: string, userId: string) => void;
  addViewer: (taskId: string, userId: string, userName: string) => void;
  removeViewer: (taskId: string, userId: string) => void;
  isUserOnline: (projectId: string, userId: string) => boolean;
  reset: () => void;
}

export const usePresenceStore = create<PresenceState>((set, get) => ({
  onlineUsers: {},
  viewersByTask: {},

  setOnlineUsers: (projectId, userIds) =>
    set((state) => ({ onlineUsers: { ...state.onlineUsers, [projectId]: userIds } })),

  addOnlineUser: (projectId, userId) =>
    set((state) => {
      const current = state.onlineUsers[projectId] || [];
      if (current.includes(userId)) return state;
      return { onlineUsers: { ...state.onlineUsers, [projectId]: [...current, userId] } };
    }),

  removeOnlineUser: (projectId, userId) =>
    set((state) => {
      const current = state.onlineUsers[projectId] || [];
      return { onlineUsers: { ...state.onlineUsers, [projectId]: current.filter((id) => id !== userId) } };
    }),

  addViewer: (taskId, userId, userName) =>
    set((state) => {
      const current = state.viewersByTask[taskId] || [];
      if (current.some((v) => v.userId === userId)) return state;
      return { viewersByTask: { ...state.viewersByTask, [taskId]: [...current, { userId, userName }] } };
    }),

  removeViewer: (taskId, userId) =>
    set((state) => {
      const current = state.viewersByTask[taskId] || [];
      return { viewersByTask: { ...state.viewersByTask, [taskId]: current.filter((v) => v.userId !== userId) } };
    }),

  isUserOnline: (projectId, userId) => {
    const online = get().onlineUsers[projectId] || [];
    return online.includes(userId);
  },
  reset: () => set({ onlineUsers: {}, viewersByTask: {} }),
}));
