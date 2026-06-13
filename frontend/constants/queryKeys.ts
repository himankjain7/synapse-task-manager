export const QueryKeys = {
  // Session queries
  userProfile: ['user', 'profile'] as const,
  sessionStatus: ['auth', 'session'] as const,

  // Feature queries (placeholders for next phases)
  tasks: {
    list: (filters?: Record<string, any>) => ['tasks', 'list', filters || {}] as const,
    detail: (id: string) => ['tasks', 'detail', id] as const,
  },
  
  notifications: {
    unread: ['notifications', 'unread'] as const,
    list: ['notifications', 'list'] as const,
  },
} as const;

export type AppQueryKeys = typeof QueryKeys;
export default QueryKeys;
