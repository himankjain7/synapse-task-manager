import api from './api';
import {
  ApiResponse,
  PaginatedResponse,
} from '../types/workspace';
import {
  TaskWithAssignee,
  TaskWithDetails,
  CommentWithAuthor,
  CommentReaction,
  CreateTaskInput,
  UpdateTaskInput,
  ReorderTaskInput,
  TaskFilters,
  CreateCommentInput,
  CreateLabelInput,
  TaskLabel,
  ActivityLogItem,
} from '../types/project';

export const taskApi = {
  list: async (projectId: string, page = 1, limit = 50, filters?: TaskFilters): Promise<PaginatedResponse<TaskWithAssignee>> => {
    const response = await api.get<ApiResponse<PaginatedResponse<TaskWithAssignee>>>(
      `/api/v1/projects/${projectId}/tasks`,
      { params: { page, limit, ...filters } }
    );
    return response.data.data;
  },

  get: async (id: string): Promise<TaskWithDetails> => {
  const response = await api.get<ApiResponse<TaskWithDetails>>(
    `/api/v1/tasks/${id}`
  );

  return response.data.data;
},

  create: async (projectId: string, input: CreateTaskInput): Promise<TaskWithAssignee> => {
    const response = await api.post<ApiResponse<TaskWithAssignee>>(
      `/api/v1/projects/${projectId}/tasks`,
      input
    );
    return response.data.data;
  },

  update: async (id: string, input: UpdateTaskInput): Promise<TaskWithAssignee> => {
    const response = await api.patch<ApiResponse<TaskWithAssignee>>(`/api/v1/tasks/${id}`, input);
    return response.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/api/v1/tasks/${id}`);
  },

  reorder: async (projectId: string, input: ReorderTaskInput[]): Promise<void> => {
    await api.put(`/api/v1/projects/${projectId}/tasks/reorder`, { tasks: input });
  },

  getComments: async (taskId: string, page = 1, limit = 50): Promise<PaginatedResponse<CommentWithAuthor>> => {
    const response = await api.get<ApiResponse<PaginatedResponse<CommentWithAuthor>>>(
      `/api/v1/tasks/${taskId}/comments`,
      { params: { page, limit } }
    );
    return response.data.data;
  },

  createComment: async (taskId: string, input: CreateCommentInput): Promise<CommentWithAuthor> => {
    const response = await api.post<ApiResponse<CommentWithAuthor>>(
      `/api/v1/tasks/${taskId}/comments`,
      input
    );
    return response.data.data;
  },

  updateComment: async (taskId: string, commentId: string, input: CreateCommentInput): Promise<CommentWithAuthor> => {
    const response = await api.patch<ApiResponse<CommentWithAuthor>>(
      `/api/v1/tasks/${taskId}/comments/${commentId}`,
      input
    );
    return response.data.data;
  },

  deleteComment: async (taskId: string, commentId: string): Promise<void> => {
    await api.delete(`/api/v1/tasks/${taskId}/comments/${commentId}`);
  },

  getLabels: async (projectId: string): Promise<TaskLabel[]> => {
    const response = await api.get<ApiResponse<TaskLabel[]>>(`/api/v1/projects/${projectId}/labels`);
    return response.data.data;
  },

  createLabel: async (projectId: string, input: CreateLabelInput): Promise<TaskLabel> => {
    const response = await api.post<ApiResponse<TaskLabel>>(`/api/v1/projects/${projectId}/labels`, input);
    return response.data.data;
  },

  updateLabel: async (projectId: string, id: string, input: CreateLabelInput): Promise<TaskLabel> => {
    const response = await api.patch<ApiResponse<TaskLabel>>(`/api/v1/projects/${projectId}/labels/${id}`, input);
    return response.data.data;
  },

  deleteLabel: async (projectId: string, id: string): Promise<void> => {
    await api.delete(`/api/v1/projects/${projectId}/labels/${id}`);
  },

  assignLabel: async (taskId: string, labelId: string): Promise<void> => {
    await api.post(`/api/v1/tasks/${taskId}/labels`, { labelId });
  },

  removeLabel: async (taskId: string, labelId: string): Promise<void> => {
    await api.delete(`/api/v1/tasks/${taskId}/labels/${labelId}`);
  },

  getTaskActivity: async (taskId: string): Promise<ActivityLogItem[]> => {
    const response = await api.get<ApiResponse<ActivityLogItem[]>>(`/api/v1/tasks/${taskId}/activity`);
    return response.data.data;
  },

  getSubtasks: async (taskId: string): Promise<Subtask[]> => {
    const response = await api.get<ApiResponse<Subtask[]>>(`/api/v1/tasks/${taskId}/subtasks`);
    return response.data.data;
  },

  createSubtask: async (taskId: string, input: { title: string }): Promise<Subtask> => {
    const response = await api.post<ApiResponse<Subtask>>(`/api/v1/tasks/${taskId}/subtasks`, input);
    return response.data.data;
  },

  updateSubtask: async (taskId: string, subtaskId: string, input: { title?: string; completed?: boolean; position?: number }): Promise<Subtask> => {
    const response = await api.patch<ApiResponse<Subtask>>(`/api/v1/tasks/${taskId}/subtasks/${subtaskId}`, input);
    return response.data.data;
  },

  deleteSubtask: async (taskId: string, subtaskId: string): Promise<void> => {
    await api.delete(`/api/v1/tasks/${taskId}/subtasks/${subtaskId}`);
  },

  bulkUpdate: async (projectId: string, data: { taskIds: string[]; status?: string; priority?: string; assignedTo?: string | null }): Promise<TaskWithAssignee[]> => {
    const response = await api.post<ApiResponse<TaskWithAssignee[]>>(`/api/v1/projects/${projectId}/tasks/bulk-update`, data);
    return response.data.data;
  },

  bulkDelete: async (projectId: string, taskIds: string[]): Promise<{ deletedCount: number }> => {
    const response = await api.post<ApiResponse<{ deletedCount: number }>>(`/api/v1/projects/${projectId}/tasks/bulk-delete`, { taskIds });
    return response.data.data;
  },

  addReaction: async (taskId: string, commentId: string, emoji: string): Promise<CommentReaction> => {
    const response = await api.post<ApiResponse<CommentReaction>>(`/api/v1/tasks/${taskId}/comments/${commentId}/reactions`, { emoji });
    return response.data.data;
  },

  removeReaction: async (taskId: string, commentId: string, emoji: string): Promise<void> => {
    await api.delete(`/api/v1/tasks/${taskId}/comments/${commentId}/reactions/${encodeURIComponent(emoji)}`);
  },
};

export interface Subtask {
  id: string;
  taskId: string;
  title: string;
  completed: boolean;
  position: number;
  createdAt: string;
  updatedAt: string;
}
