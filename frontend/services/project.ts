import api from './api';
import {
  ApiResponse,
  PaginatedResponse,
} from '../types/workspace';
import {
  ProjectWithStats,
  CreateProjectInput,
  UpdateProjectInput,
} from '../types/project';

export const projectApi = {
  list: async (
    workspaceId: string,
    page = 1,
    limit = 50
  ): Promise<PaginatedResponse<ProjectWithStats>> => {
    const response = await api.get<
      ApiResponse<PaginatedResponse<ProjectWithStats>>
    >(
      `/api/v1/workspaces/${workspaceId}/projects`,
      { params: { page, limit } }
    );

    return response.data.data;
  },

  get: async (id: string): Promise<ProjectWithStats> => {
    const response = await api.get<ApiResponse<ProjectWithStats>>(
      `/api/v1/projects/${id}`
    );

    return response.data.data;
  },

  create: async (
    workspaceId: string,
    input: CreateProjectInput
  ): Promise<ProjectWithStats> => {
    try {
      alert(`Workspace ID: ${workspaceId}`);

      const response = await api.post<ApiResponse<ProjectWithStats>>(
        `/api/v1/workspaces/${workspaceId}/projects`,
        input
      );

      return response.data.data;
    } catch (error: any) {
      alert(
        JSON.stringify(
          error?.response?.data || error?.message || error,
          null,
          2
        )
      );

      throw error;
    }
  },

  update: async (
    id: string,
    input: UpdateProjectInput
  ): Promise<ProjectWithStats> => {
    const response = await api.patch<ApiResponse<ProjectWithStats>>(
      `/api/v1/projects/${id}`,
      input
    );

    return response.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/api/v1/projects/${id}`);
  },
};