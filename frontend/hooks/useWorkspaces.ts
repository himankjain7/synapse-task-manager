import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workspaceApi } from '../services/workspace';
import { QueryKeys } from '../constants/queryKeys';
import {
  CreateWorkspaceInput,
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
      queryClient.invalidateQueries({ queryKey: QueryKeys.analytics.all });
    },
  });
}

export function useDeleteWorkspace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => workspaceApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.workspaces.lists() });
      queryClient.invalidateQueries({ queryKey: QueryKeys.analytics.all });
    },
  });
}

export function useMembers(workspaceId: string | undefined) {
  const queryKey = QueryKeys.workspaces.members(workspaceId!);
  const enabled = !!workspaceId;
  console.log("[DEBUG useMembers] input:", { workspaceId, enabled, queryKey });
  return useQuery({
    queryKey,
    queryFn: () => workspaceApi.getMembers(workspaceId!),
    enabled,
  });
}

export function useInviteMember(workspaceId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: InviteMemberInput) => workspaceApi.inviteMember(workspaceId!, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.workspaces.members(workspaceId!) });
      queryClient.invalidateQueries({ queryKey: QueryKeys.analytics.all });
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
      queryClient.invalidateQueries({ queryKey: QueryKeys.analytics.all });
    },
  });
}

export function useRemoveMember(workspaceId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) => workspaceApi.removeMember(workspaceId!, memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.workspaces.members(workspaceId!) });
      queryClient.invalidateQueries({ queryKey: QueryKeys.analytics.all });
    },
  });
}
