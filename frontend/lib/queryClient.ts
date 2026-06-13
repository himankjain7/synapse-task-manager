import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '../utils/error';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        // Don't retry on 401, 403, or 404 client errors
        if (error instanceof ApiError) {
          if ([401, 403, 404].includes(error.status || 0)) {
            return false;
          }
        }
        return failureCount < 3;
      },
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes (garbage collection/cache time)
      refetchOnWindowFocus: false,
      refetchOnReconnect: 'always',
    },
    mutations: {
      retry: false, // Don't auto-retry mutations to prevent duplicate actions
    },
  },
});
