import api from './api';
import {
  ApiResponse,
  PaginatedResponse,
} from '../types/workspace';
import {
  TaskWithAssignee,
  CommentWithAuthor,
  CreateTaskInput,
  UpdateTaskInput,
  ReorderTaskInput,
  TaskFilters,
  CreateCommentInput,
} from '../types/project';

export const taskApi = {
  list: async (projectId: string, page = 1, limit = 50): Promise<PaginatedResponse<TaskWithAssignee>> => {
    const response = await api.get<ApiResponse<PaginatedResponse<TaskWithAssignee>>>(
      `/api/v1/projects/${projectId}/tasks`,
      { params: { page, limit } }
    );
    return response.data.data;
  },

  get: async (id: string): Promise<TaskWithAssignee> => {
    const response = await api.get<ApiResponse<TaskWithAssignee>>(`/api/v1/tasks/${id}`);
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
};
