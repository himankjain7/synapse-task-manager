import api from './api';

export interface WorkspaceAnalytics {
  totalProjects: number;
  totalTasks: number;
  completedTasks: number;
  activeTasks: number;
  overdueTasks: number;
  completionPercent: number;
  tasksByPriority: { priority: string; count: number }[];
  tasksByStatus: { status: string; count: number }[];
  recentActivity: { id: string; action: string; userId: string; userName: string; createdAt: string }[];
  upcomingDeadlines: { id: string; title: string; dueDate: string; projectId: string; projectName: string }[];
  insights: string[];
}

export interface ProjectAnalytics {
  totalTasks: number;
  completedTasks: number;
  completionPercent: number;
  velocity: number;
  completionTrend: { date: string; count: number }[];
  tasksByStatus: { status: string; count: number }[];
  tasksByPriority: { priority: string; count: number }[];
}

export interface UserAnalytics {
  assignedTasks: number;
  completedThisWeek: number;
  completedThisMonth: number;
  overdueAssigned: number;
}

export const analyticsApi = {
  getWorkspaceAnalytics: async (workspaceId: string): Promise<WorkspaceAnalytics> => {
    const response = await api.get(`/api/v1/analytics/workspaces/${workspaceId}`);
    return response.data.data;
  },
  getProjectAnalytics: async (projectId: string): Promise<ProjectAnalytics> => {
    const response = await api.get(`/api/v1/analytics/projects/${projectId}`);
    return response.data.data;
  },
  getUserAnalytics: async (workspaceId?: string): Promise<UserAnalytics> => {
    const response = await api.get('/api/v1/analytics/user', { params: { workspaceId } });
    return response.data.data;
  },
};
