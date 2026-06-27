import { useQuery } from '@tanstack/react-query';
import { searchApi } from '../services/search';
import { QueryKeys } from '../constants/queryKeys';

export function useGlobalSearch(query: string, workspaceId: string | undefined) {
  return useQuery({
    queryKey: QueryKeys.search.global(workspaceId!, query),
    queryFn: () => searchApi.global(query, workspaceId),
    enabled: query.length >= 2 && !!workspaceId,
  });
}
