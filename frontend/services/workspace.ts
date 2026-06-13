import api from './api';
import {
  ApiResponse,
  WorkspaceWithOwner,
  Workspace,
  WorkspaceMemberWithUser,
  WorkspaceMember,
  PaginatedResponse,
  CreateWorkspaceInput,
  UpdateWorkspaceInput,
  InviteMemberInput,
  UpdateMemberRoleInput,
} from '../types/workspace';

export const workspaceApi = {
  list: async (page = 1, limit = 20): Promise<PaginatedResponse<WorkspaceWithOwner>> => {
    const response = await api.get<ApiResponse<PaginatedResponse<WorkspaceWithOwner>>>('/api/v1/workspaces', {
      params: { page, limit },
    });
    return response.data.data;
  },

  get: async (id: string): Promise<WorkspaceWithOwner> => {
    const response = await api.get<ApiResponse<WorkspaceWithOwner>>(`/api/v1/workspaces/${id}`);
    return response.data.data;
  },

  create: async (input: CreateWorkspaceInput): Promise<WorkspaceWithOwner> => {
    const response = await api.post<ApiResponse<WorkspaceWithOwner>>('/api/v1/workspaces', input);
    return response.data.data;
  },

  update: async (id: string, input: UpdateWorkspaceInput): Promise<Workspace> => {
    const response = await api.patch<ApiResponse<Workspace>>(`/api/v1/workspaces/${id}`, input);
    return response.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/api/v1/workspaces/${id}`);
  },

  getMembers: async (workspaceId: string, page = 1, limit = 50): Promise<PaginatedResponse<WorkspaceMemberWithUser>> => {
    const response = await api.get<ApiResponse<PaginatedResponse<WorkspaceMemberWithUser>>>(
      `/api/v1/workspaces/${workspaceId}/members`,
      { params: { page, limit } }
    );
    return response.data.data;
  },

  inviteMember: async (workspaceId: string, input: InviteMemberInput): Promise<WorkspaceMemberWithUser> => {
    const response = await api.post<ApiResponse<WorkspaceMemberWithUser>>(
      `/api/v1/workspaces/${workspaceId}/members`,
      input
    );
    return response.data.data;
  },

  updateMemberRole: async (workspaceId: string, memberId: string, input: UpdateMemberRoleInput): Promise<WorkspaceMember> => {
    const response = await api.patch<ApiResponse<WorkspaceMember>>(
      `/api/v1/workspaces/${workspaceId}/members/${memberId}`,
      input
    );
    return response.data.data;
  },

  removeMember: async (workspaceId: string, memberId: string): Promise<void> => {
    await api.delete(`/api/v1/workspaces/${workspaceId}/members/${memberId}`);
  },

  leave: async (workspaceId: string): Promise<void> => {
    await api.post(`/api/v1/workspaces/${workspaceId}/leave`);
  },
};
