import { useQuery } from '@tanstack/react-query';
import { searchApi } from '../services/search';

export function useGlobalSearch(query: string) {
  return useQuery({
    queryKey: ['search', 'global', query],
    queryFn: () => searchApi.global(query),
    enabled: query.length >= 2,
  });
}
