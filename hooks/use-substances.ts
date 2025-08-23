import { useQuery } from '@tanstack/react-query';
import { get, API_ENDPOINTS } from '@/lib/api';
import { Substance } from '@/lib/schemas';

export function useSubstances() {
  return useQuery({
    queryKey: ['substances'],
    queryFn: () => get<{ items: Substance[] }>(API_ENDPOINTS.substances),
    staleTime: 1000 * 60 * 10, // 10 minutes - substances don't change often
  });
}
