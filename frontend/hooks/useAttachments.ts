import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { attachmentApi } from '../services/attachments';
import { QueryKeys } from '../constants/queryKeys';

export function useTaskAttachments(taskId: string | undefined) {
  return useQuery({
    queryKey: ['attachments', taskId],
    queryFn: () => attachmentApi.list(taskId!),
    enabled: !!taskId,
  });
}

export function useUploadAttachment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, file }: { taskId: string; file: FormData }) =>
      attachmentApi.upload(taskId, file),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['attachments', variables.taskId] });
      queryClient.invalidateQueries({ queryKey: QueryKeys.analytics.all });
    },
  });
}

export function useDeleteAttachment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, id }: { taskId: string; id: string }) =>
      attachmentApi.delete(taskId, id),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['attachments', variables.taskId] });
      queryClient.invalidateQueries({ queryKey: QueryKeys.analytics.all });
    },
  });
}
