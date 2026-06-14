import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QueryKeys } from '../constants/queryKeys';
import { projectApi } from '../services/project';
import {
  CreateProjectInput,
  UpdateProjectInput,
} from '../types/project';

export function useProjects(workspaceId: string | undefined) {
  return useQuery({
    queryKey: QueryKeys.projects.byWorkspace(workspaceId!),
    queryFn: () => projectApi.list(workspaceId!),
    enabled: !!workspaceId,
  });
}

export function useProject(id: string | undefined) {
  return useQuery({
    queryKey: QueryKeys.projects.detail(id!),
    queryFn: () => projectApi.get(id!),
    enabled: !!id,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId, input }: { workspaceId: string; input: CreateProjectInput }) =>
      projectApi.create(workspaceId, input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.projects.byWorkspace(variables.workspaceId) });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateProjectInput }) =>
      projectApi.update(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.projects.all });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => projectApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.projects.all });
    },
  });
}
