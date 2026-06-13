export const QueryKeys = {
  userProfile: ['user', 'profile'] as const,
  sessionStatus: ['auth', 'session'] as const,

  workspaces: {
    all: ['workspaces'] as const,
    lists: () => ['workspaces', 'list'] as const,
    detail: (id: string) => ['workspaces', 'detail', id] as const,
    members: (id: string) => ['workspaces', 'members', id] as const,
  },

  tasks: {
    list: (filters?: Record<string, unknown>) => ['tasks', 'list', filters || {}] as const,
    detail: (id: string) => ['tasks', 'detail', id] as const,
  },

  notifications: {
    unread: ['notifications', 'unread'] as const,
    list: ['notifications', 'list'] as const,
  },
} as const;

export type AppQueryKeys = typeof QueryKeys;
export default QueryKeys;
