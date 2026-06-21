export const QueryKeys = {
  userProfile: ['user', 'profile'] as const,
  sessionStatus: ['auth', 'session'] as const,

  workspaces: {
    all: ['workspaces'] as const,
    lists: () => ['workspaces', 'list'] as const,
    detail: (id: string) => ['workspaces', 'detail', id] as const,
    members: (id: string) => ['workspaces', 'members', id] as const,
  },

  projects: {
    all: ['projects'] as const,
    lists: () => ['projects', 'list'] as const,
    detail: (id: string) => ['projects', 'detail', id] as const,
    byWorkspace: (workspaceId: string) => ['projects', 'workspace', workspaceId] as const,
  },

  tasks: {
    all: ['tasks'] as const,
    lists: () => ['tasks', 'list'] as const,
    byProject: (projectId: string) => ['tasks', 'project', projectId] as const,
    detail: (id: string) => ['tasks', 'detail', id] as const,
    comments: (taskId: string) => ['tasks', 'comments', taskId] as const,
  },

  notifications: {
    unread: ['notifications', 'unread'] as const,
    list: ['notifications', 'list'] as const,
  },

  analytics: {
    all: ['analytics'] as const,
    workspace: (id: string) => ['analytics', 'workspace', id] as const,
    project: (id: string) => ['analytics', 'project', id] as const,
    user: ['analytics', 'user'] as const,
  },
} as const;

export type AppQueryKeys = typeof QueryKeys;
export default QueryKeys;
