import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QueryKeys } from '../constants/queryKeys';
import { taskApi } from '../services/task';
import {
  CreateTaskInput,
  UpdateTaskInput,
  CreateCommentInput,
} from '../types/project';

export function useTasks(projectId: string | undefined) {
  return useQuery({
    queryKey: QueryKeys.tasks.byProject(projectId!),
    queryFn: () => taskApi.list(projectId!),
    enabled: !!projectId,
  });
}

export function useTask(id: string | undefined) {
  return useQuery({
    queryKey: QueryKeys.tasks.detail(id!),
    queryFn: () => taskApi.get(id!),
    enabled: !!id,
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, input }: { projectId: string; input: CreateTaskInput }) =>
      taskApi.create(projectId, input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.tasks.byProject(variables.projectId) });
      queryClient.invalidateQueries({ queryKey: QueryKeys.projects.all });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTaskInput }) =>
      taskApi.update(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.tasks.all });
      queryClient.invalidateQueries({ queryKey: QueryKeys.projects.all });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => taskApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.tasks.all });
      queryClient.invalidateQueries({ queryKey: QueryKeys.projects.all });
    },
  });
}

export function useReorderTasks() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, tasks }: { projectId: string; tasks: { taskId: string; status: string; position: number }[] }) =>
      taskApi.reorder(projectId, tasks.map(t => ({ ...t, status: t.status as any }))),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.tasks.all });
    },
  });
}

export function useTaskComments(taskId: string | undefined) {
  return useQuery({
    queryKey: QueryKeys.tasks.comments(taskId!),
    queryFn: () => taskApi.getComments(taskId!),
    enabled: !!taskId,
  });
}

export function useCreateComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, input }: { taskId: string; input: CreateCommentInput }) =>
      taskApi.createComment(taskId, input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.tasks.comments(variables.taskId) });
    },
  });
}

export function useDeleteComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, commentId }: { taskId: string; commentId: string }) =>
      taskApi.deleteComment(taskId, commentId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.tasks.comments(variables.taskId) });
    },
  });
}
