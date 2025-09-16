import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { keys, invalidationHelpers } from '@/lib/query-keys';
import { get, post, put, del, API_ENDPOINTS, withQuery } from '@/lib/api';
import { 
  JoinRequestWithDetails,
  JoinRequestsListResponseSchema,
  CreateJoinRequestInput,
  UpdateJoinRequestInput 
} from '@/lib/schemas';
import { useToast } from '@/components/ui/use-toast';

// Query hooks
export function useJoinRequests(roomId: string) {
  return useQuery({
    queryKey: keys.joinRequests.list(roomId),
    queryFn: () => get(withQuery(API_ENDPOINTS.joinRequests, { roomId }))
      .then(data => {
        try {
          return JoinRequestsListResponseSchema.parse(data);
        } catch (error) {
          console.error('Schema validation error:', error);
          // Return raw data if schema validation fails
          return data;
        }
      }),
    enabled: !!roomId,
    staleTime: 1000 * 30, // 30 seconds
  });
}

export function useMyJoinRequests(userId: string) {
  return useQuery({
    queryKey: keys.joinRequests.byUserId(userId),
    queryFn: () => get(withQuery(API_ENDPOINTS.joinRequests, { userId }))
      .then(data => JoinRequestsListResponseSchema.parse(data)),
    enabled: !!userId,
    staleTime: 1000 * 60, // 1 minute
  });
}

// Mutation hooks
export function useCreateJoinRequest() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: CreateJoinRequestInput) => 
      post(API_ENDPOINTS.joinRequests, data),
    onSuccess: (data, variables) => {
      // Invalidate join request queries
      queryClient.invalidateQueries({ queryKey: keys.joinRequests.all });
      queryClient.invalidateQueries({ queryKey: keys.rooms.all });
      
      toast({
        title: 'Başarılı',
        description: 'Katılım talebi başarıyla gönderildi',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Hata',
        description: error?.data?.message || 'Katılım talebi gönderilemedi',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateJoinRequest() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateJoinRequestInput }) => 
      put(API_ENDPOINTS.joinRequest(id), data),
    onSuccess: (data, variables) => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: keys.joinRequests.all });
      queryClient.invalidateQueries({ queryKey: keys.rooms.all });
      queryClient.invalidateQueries({ queryKey: keys.members.all });
      
      const status = variables.data.status;
      const statusText = status === 'approved' ? 'onaylandı' : 
                        status === 'rejected' ? 'reddedildi' : 'iptal edildi';
      
      toast({
        title: 'Başarılı',
        description: `Katılım talebi ${statusText}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Hata',
        description: error?.data?.message || 'Katılım talebi güncellenemedi',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteJoinRequest() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => del(API_ENDPOINTS.joinRequest(id)),
    onSuccess: () => {
      // Invalidate join request queries
      queryClient.invalidateQueries({ queryKey: keys.joinRequests.all });
      
      toast({
        title: 'Başarılı',
        description: 'Katılım talebi iptal edildi',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Hata',
        description: error?.data?.message || 'Katılım talebi iptal edilemedi',
        variant: 'destructive',
      });
    },
  });
}
