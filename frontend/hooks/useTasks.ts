import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QueryKeys } from '../constants/queryKeys';
import { taskApi, Subtask } from '../services/task';
import {
  CreateTaskInput,
  UpdateTaskInput,
  CreateCommentInput,
  CreateLabelInput,
  TaskFilters,
  TaskWithAssignee,
} from '../types/project';

export function useTasks(projectId: string | undefined, filters?: TaskFilters) {
  return useQuery({
    queryKey: [...QueryKeys.tasks.byProject(projectId!), filters || {}],
    queryFn: () => taskApi.list(projectId!, 1, 50, filters),
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
      queryClient.invalidateQueries({ queryKey: QueryKeys.analytics.all });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTaskInput }) =>
      taskApi.update(id, input),
    onMutate: async ({ id, input }) => {
      await queryClient.cancelQueries({ queryKey: QueryKeys.tasks.detail(id) });
      const prev = queryClient.getQueryData(QueryKeys.tasks.detail(id));
      const newAssigneeId = input.assignedTo ?? input.assigneeId;
      if (prev && newAssigneeId !== undefined) {
        queryClient.setQueryData(QueryKeys.tasks.detail(id), {
          ...prev,
          assigneeId: newAssigneeId,
          assignee: newAssigneeId
            ? { ...(prev as any).assignee, id: newAssigneeId }
            : null,
        });
      }
      return { prev };
    },
    onError: (_err, variables, context) => {
      if (context?.prev) {
        queryClient.setQueryData(QueryKeys.tasks.detail(variables.id), context.prev);
      }
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.tasks.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: ['task-activity', variables.id] });
      queryClient.invalidateQueries({ queryKey: QueryKeys.tasks.all });
      queryClient.invalidateQueries({ queryKey: QueryKeys.projects.all });
      queryClient.invalidateQueries({ queryKey: QueryKeys.analytics.all });
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
      queryClient.invalidateQueries({ queryKey: QueryKeys.analytics.all });
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
      queryClient.invalidateQueries({ queryKey: ['task-activity', variables.taskId] });
      queryClient.invalidateQueries({ queryKey: QueryKeys.analytics.all });
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
      queryClient.invalidateQueries({ queryKey: ['task-activity', variables.taskId] });
      queryClient.invalidateQueries({ queryKey: QueryKeys.analytics.all });
    },
  });
}

export function useUpdateComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, commentId, input }: { taskId: string; commentId: string; input: CreateCommentInput }) =>
      taskApi.updateComment(taskId, commentId, input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.tasks.comments(variables.taskId) });
      queryClient.invalidateQueries({ queryKey: ['task-activity', variables.taskId] });
      queryClient.invalidateQueries({ queryKey: QueryKeys.analytics.all });
    },
  });
}

export function useLabels(projectId: string | undefined) {
  return useQuery({
    queryKey: ['labels', 'project', projectId],
    queryFn: () => taskApi.getLabels(projectId!),
    enabled: !!projectId,
  });
}

export function useCreateLabel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, input }: { projectId: string; input: CreateLabelInput }) =>
      taskApi.createLabel(projectId, input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['labels', 'project', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: QueryKeys.analytics.all });
    },
  });
}

export function useAssignLabel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, labelId }: { taskId: string; labelId: string }) =>
      taskApi.assignLabel(taskId, labelId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.tasks.all });
      queryClient.invalidateQueries({ queryKey: ['task-activity', variables.taskId] });
      queryClient.invalidateQueries({ queryKey: QueryKeys.analytics.all });
    },
  });
}

export function useRemoveLabel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, labelId }: { taskId: string; labelId: string }) =>
      taskApi.removeLabel(taskId, labelId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.tasks.all });
      queryClient.invalidateQueries({ queryKey: ['task-activity', variables.taskId] });
      queryClient.invalidateQueries({ queryKey: QueryKeys.analytics.all });
    },
  });
}

export function useTaskActivity(taskId: string | undefined) {
  return useQuery({
    queryKey: ['task-activity', taskId],
    queryFn: () => taskApi.getTaskActivity(taskId!),
    enabled: !!taskId,
  });
}

export function useSubtasks(taskId: string | undefined) {
  return useQuery({
    queryKey: ['subtasks', taskId],
    queryFn: () => taskApi.getSubtasks(taskId!),
    enabled: !!taskId,
  });
}

export function useCreateSubtask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, input }: { taskId: string; input: { title: string } }) =>
      taskApi.createSubtask(taskId, input),
    onMutate: async ({ taskId, input }) => {
      await queryClient.cancelQueries({ queryKey: ['subtasks', taskId] });
      const prev = queryClient.getQueryData<Subtask[]>(['subtasks', taskId]);
      const optimistic: Subtask = {
        id: `new-${Date.now()}`,
        taskId,
        title: input.title,
        completed: false,
        position: prev?.length ?? 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      queryClient.setQueryData(['subtasks', taskId], [...(prev || []), optimistic]);
      return { prev };
    },
    onError: (_err, variables, context) => {
      if (context?.prev) queryClient.setQueryData(['subtasks', variables.taskId], context.prev);
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: ['subtasks', variables.taskId] });
      queryClient.invalidateQueries({ queryKey: ['task-activity', variables.taskId] });
      queryClient.invalidateQueries({ queryKey: QueryKeys.tasks.detail(variables.taskId) });
      queryClient.invalidateQueries({ queryKey: QueryKeys.analytics.all });
    },
  });
}

export function useUpdateSubtask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, subtaskId, input }: { taskId: string; subtaskId: string; input: { title?: string; completed?: boolean; position?: number } }) =>
      taskApi.updateSubtask(taskId, subtaskId, input),
    onMutate: async ({ taskId, subtaskId, input }) => {
      await queryClient.cancelQueries({ queryKey: ['subtasks', taskId] });
      const prev = queryClient.getQueryData<Subtask[]>(['subtasks', taskId]);
      if (prev) {
        queryClient.setQueryData(['subtasks', taskId], prev.map(s =>
          s.id === subtaskId ? { ...s, ...input } : s
        ));
      }
      return { prev };
    },
    onError: (_err, variables, context) => {
      if (context?.prev) queryClient.setQueryData(['subtasks', variables.taskId], context.prev);
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: ['subtasks', variables.taskId] });
      queryClient.invalidateQueries({ queryKey: ['task-activity', variables.taskId] });
      queryClient.invalidateQueries({ queryKey: QueryKeys.tasks.detail(variables.taskId) });
      queryClient.invalidateQueries({ queryKey: QueryKeys.analytics.all });
    },
  });
}

export function useDeleteSubtask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, subtaskId }: { taskId: string; subtaskId: string }) =>
      taskApi.deleteSubtask(taskId, subtaskId),
    onMutate: async ({ taskId, subtaskId }) => {
      await queryClient.cancelQueries({ queryKey: ['subtasks', taskId] });
      const prev = queryClient.getQueryData<Subtask[]>(['subtasks', taskId]);
      if (prev) {
        queryClient.setQueryData(['subtasks', taskId], prev.filter(s => s.id !== subtaskId));
      }
      return { prev };
    },
    onError: (_err, variables, context) => {
      if (context?.prev) queryClient.setQueryData(['subtasks', variables.taskId], context.prev);
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: ['subtasks', variables.taskId] });
      queryClient.invalidateQueries({ queryKey: ['task-activity', variables.taskId] });
      queryClient.invalidateQueries({ queryKey: QueryKeys.tasks.detail(variables.taskId) });
      queryClient.invalidateQueries({ queryKey: QueryKeys.analytics.all });
    },
  });
}

export function useBulkUpdateTasks(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { taskIds: string[]; status?: string; priority?: string; assignedTo?: string | null }) =>
      taskApi.bulkUpdate(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.tasks.byProject(projectId) });
      queryClient.invalidateQueries({ queryKey: QueryKeys.projects.detail(projectId) });
      queryClient.invalidateQueries({ queryKey: QueryKeys.analytics.all });
    },
  });
}

export function useBulkDeleteTasks(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (taskIds: string[]) => taskApi.bulkDelete(projectId, taskIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.tasks.byProject(projectId) });
      queryClient.invalidateQueries({ queryKey: QueryKeys.projects.detail(projectId) });
      queryClient.invalidateQueries({ queryKey: QueryKeys.analytics.all });
    },
  });
}

export function useAddReaction(taskId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ commentId, emoji }: { commentId: string; emoji: string }) =>
      taskApi.addReaction(taskId, commentId, emoji),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.tasks.comments(taskId) });
    },
  });
}

export function useRemoveReaction(taskId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ commentId, emoji }: { commentId: string; emoji: string }) =>
      taskApi.removeReaction(taskId, commentId, emoji),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.tasks.comments(taskId) });
    },
  });
}
