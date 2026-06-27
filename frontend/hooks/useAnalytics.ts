import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '../services/analytics';
import { QueryKeys } from '../constants/queryKeys';

export function useWorkspaceAnalytics(workspaceId: string | undefined) {
  return useQuery({
    queryKey: QueryKeys.analytics.workspace(workspaceId!),
    queryFn: () => analyticsApi.getWorkspaceAnalytics(workspaceId!),
    enabled: !!workspaceId,
  });
}

export function useUserAnalytics(workspaceId?: string) {
  return useQuery({
    queryKey: QueryKeys.analytics.user(workspaceId),
    queryFn: () => analyticsApi.getUserAnalytics(workspaceId),
    refetchInterval: 30000,
  });
}
