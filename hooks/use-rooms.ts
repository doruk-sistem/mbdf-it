import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { keys, invalidationHelpers } from '@/lib/query-keys';
import { get, post, put, del, API_ENDPOINTS, withQuery } from '@/lib/api';
import { 
  RoomWithDetails, 
  RoomsListResponseSchema,
  CreateRoomInput,
  RoomWithDetailsSchema 
} from '@/lib/schemas';
import { useToast } from '@/components/ui/use-toast';

// Query hooks
export function useRooms() {
  return useQuery({
    queryKey: keys.rooms.list(),
    queryFn: () => get(API_ENDPOINTS.rooms).then(data => RoomsListResponseSchema.parse(data)),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useRoom(roomId: string) {
  return useQuery({
    queryKey: keys.rooms.byId(roomId),
    queryFn: () => get(API_ENDPOINTS.room(roomId)).then(data => RoomWithDetailsSchema.parse(data)),
    enabled: !!roomId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Mutation hooks
export function useCreateRoom() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: CreateRoomInput) => post(API_ENDPOINTS.rooms, data),
    onSuccess: () => {
      // Invalidate rooms list
      queryClient.invalidateQueries({ queryKey: keys.rooms.all });
      toast({
        title: 'Success',
        description: 'Room created successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error?.data?.message || 'Failed to create room',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateRoom(roomId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: Partial<Pick<RoomWithDetails, 'name' | 'description' | 'status'>>) =>
      put(API_ENDPOINTS.room(roomId), data),
    onSuccess: () => {
      // Invalidate related data
      invalidationHelpers.room(roomId).forEach(key => {
        queryClient.invalidateQueries({ queryKey: key });
      });
      toast({
        title: 'Success',
        description: 'Room updated successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error?.data?.message || 'Failed to update room',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteRoom(roomId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: () => del(API_ENDPOINTS.room(roomId)),
    onSuccess: () => {
      // Invalidate related data
      invalidationHelpers.room(roomId).forEach(key => {
        queryClient.invalidateQueries({ queryKey: key });
      });
      toast({
        title: 'Success',
        description: 'Room archived successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error?.data?.message || 'Failed to archive room',
        variant: 'destructive',
      });
    },
  });
}