import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '../services/analytics';

export function useWorkspaceAnalytics(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ['analytics', 'workspace', workspaceId],
    queryFn: () => analyticsApi.getWorkspaceAnalytics(workspaceId!),
    enabled: !!workspaceId,
  });
}

export function useProjectAnalytics(projectId: string | undefined) {
  return useQuery({
    queryKey: ['analytics', 'project', projectId],
    queryFn: () => analyticsApi.getProjectAnalytics(projectId!),
    enabled: !!projectId,
  });
}

export function useUserAnalytics() {
  return useQuery({
    queryKey: ['analytics', 'user'],
    queryFn: () => analyticsApi.getUserAnalytics(),
  });
}
