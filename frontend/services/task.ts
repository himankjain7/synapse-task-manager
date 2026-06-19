import api from './api';
import {
  ApiResponse,
  PaginatedResponse,
} from '../types/workspace';
import {
  TaskWithAssignee,
  TaskWithDetails,
  CommentWithAuthor,
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

  getActivity: async (workspaceId: string, limit = 50): Promise<ActivityLogItem[]> => {
    const response = await api.get<ApiResponse<ActivityLogItem[]>>(`/api/v1/workspaces/${workspaceId}/activity`, { params: { limit } });
    return response.data.data;
  },
};
