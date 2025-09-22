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
  roomId: z.string().optional(),
  documentId: z.string().optional(),
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

export function useDetailedActivities(options?: {
  limit?: number;
  offset?: number;
  type?: string;
}) {
  const { limit = 50, offset = 0, type } = options || {};
  
  return useQuery({
    queryKey: keys.activities.detailed(limit, offset, type),
    queryFn: async () => {
      try {
        const params = new URLSearchParams({
          limit: limit.toString(),
          offset: offset.toString(),
          ...(type && { type }),
        });
        
        const data = await get(`${API_ENDPOINTS.activities}?${params}`);
        const parsed = ActivitiesListResponseSchema.parse(data);
        return parsed;
      } catch (error) {
        console.error('❌ useDetailedActivities: Error:', error);
        throw error;
      }
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}
