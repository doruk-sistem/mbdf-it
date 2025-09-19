import { useQuery } from '@tanstack/react-query';
import { keys } from '@/lib/query-keys';
import { get, API_ENDPOINTS } from '@/lib/api';
import { z } from 'zod';

// Activity schema
const ActivitySchema = z.object({
  id: z.string(),
  action: z.string(),
  user: z.string(),
  room: z.string(),
  time: z.string(),
  type: z.string(),
  timestamp: z.number(),
});

const ActivitiesListResponseSchema = z.object({
  items: z.array(ActivitySchema),
  total: z.number(),
  success: z.boolean().optional(),
});

export type Activity = z.infer<typeof ActivitySchema>;
export type ActivitiesListResponse = z.infer<typeof ActivitiesListResponseSchema>;

// Query hooks
export function useRecentActivities() {
  return useQuery({
    queryKey: keys.activities.recent(),
    queryFn: async () => {
      try {
        const data = await get(API_ENDPOINTS.activities);
        const parsed = ActivitiesListResponseSchema.parse(data);
        return parsed;
      } catch (error) {
        console.error('❌ useRecentActivities: Error:', error);
        throw error;
      }
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}
