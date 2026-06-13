import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workspaceApi } from '../services/workspace';
import { QueryKeys } from '../constants/queryKeys';
import {
  CreateWorkspaceInput,
  UpdateWorkspaceInput,
  InviteMemberInput,
  UpdateMemberRoleInput,
} from '../types/workspace';

export function useWorkspaces(page = 1) {
  return useQuery({
    queryKey: QueryKeys.workspaces.lists(),
    queryFn: () => workspaceApi.list(page),
    staleTime: 1000 * 60,
  });
}

export function useWorkspace(id: string | undefined) {
  return useQuery({
    queryKey: QueryKeys.workspaces.detail(id!),
    queryFn: () => workspaceApi.get(id!),
    enabled: !!id,
  });
}

export function useCreateWorkspace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateWorkspaceInput) => workspaceApi.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.workspaces.lists() });
    },
  });
}

export function useUpdateWorkspace(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateWorkspaceInput) => workspaceApi.update(id!, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.workspaces.detail(id!) });
      queryClient.invalidateQueries({ queryKey: QueryKeys.workspaces.lists() });
    },
  });
}

export function useDeleteWorkspace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => workspaceApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.workspaces.lists() });
    },
  });
}

export function useMembers(workspaceId: string | undefined) {
  return useQuery({
    queryKey: QueryKeys.workspaces.members(workspaceId!),
    queryFn: () => workspaceApi.getMembers(workspaceId!),
    enabled: !!workspaceId,
  });
}

export function useInviteMember(workspaceId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: InviteMemberInput) => workspaceApi.inviteMember(workspaceId!, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.workspaces.members(workspaceId!) });
    },
  });
}

export function useUpdateMemberRole(workspaceId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, input }: { memberId: string; input: UpdateMemberRoleInput }) =>
      workspaceApi.updateMemberRole(workspaceId!, memberId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.workspaces.members(workspaceId!) });
    },
  });
}

export function useRemoveMember(workspaceId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) => workspaceApi.removeMember(workspaceId!, memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.workspaces.members(workspaceId!) });
    },
  });
}
