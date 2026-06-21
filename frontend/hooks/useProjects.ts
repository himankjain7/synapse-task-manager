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

export function useProject(
  workspaceId: string | undefined,
  projectId: string | undefined
) {
  return useQuery({
    queryKey: QueryKeys.projects.detail(projectId!),
    queryFn: () => projectApi.get(workspaceId!, projectId!),
    enabled: !!workspaceId && !!projectId,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      workspaceId,
      input,
    }: {
      workspaceId: string;
      input: CreateProjectInput;
    }) => projectApi.create(workspaceId, input),

    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: QueryKeys.projects.byWorkspace(
          variables.workspaceId
        ),
      });
      queryClient.invalidateQueries({ queryKey: QueryKeys.analytics.all });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      workspaceId,
      id,
      input,
    }: {
      workspaceId: string;
      id: string;
      input: UpdateProjectInput;
    }) => projectApi.update(workspaceId, id, input),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QueryKeys.projects.all,
      });
      queryClient.invalidateQueries({ queryKey: QueryKeys.analytics.all });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      workspaceId,
      id,
    }: {
      workspaceId: string;
      id: string;
    }) => projectApi.delete(workspaceId, id),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QueryKeys.projects.all,
      });
      queryClient.invalidateQueries({ queryKey: QueryKeys.analytics.all });
    },
  });
}
