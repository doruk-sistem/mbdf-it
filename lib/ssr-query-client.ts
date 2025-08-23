import { QueryClient } from '@tanstack/react-query';

export function createSSRQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // With SSR, we usually want to set some default staleTime
        // above 0 to avoid refetching immediately on the client
        staleTime: 30 * 1000, // 30 seconds
        gcTime: 5 * 60 * 1000, // 5 minutes
        retry: 1,
      },
      mutations: {
        retry: 1,
      },
    },
  });
}