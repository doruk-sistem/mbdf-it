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
import { z } from 'zod';

// Archive-related schemas
const ArchivePrecheckResponseSchema = z.object({
  room: z.object({
    id: z.string().uuid(),
    name: z.string(),
    status: z.enum(['active', 'closed', 'archived']),
    substance: z.object({
      ec_number: z.string().nullable(),
      cas_number: z.string().nullable(),
    }).nullable(),
  }),
  counts: z.object({
    pending_requests: z.number(),
    approved_requests: z.number(),
    open_votes: z.number(),
    draft_agreements: z.number(),
    total_members: z.number(),
  }),
  effects: z.object({
    pending_will_be_rejected: z.number(),
    approved_will_be_revoked: z.number(),
    votes_will_be_closed: z.number(),
  }),
  can_archive: z.boolean(),
  reasons: z.array(z.string()),
});

const ArchiveResponseSchema = z.object({
  success: z.boolean(),
  room_id: z.string().uuid(),
  room_name: z.string(),
  archived_at: z.string(),
  archive_reason: z.string().nullable(),
  pending_requests_rejected: z.number(),
  approved_requests_revoked: z.number(),
});

const UnarchiveResponseSchema = z.object({
  success: z.boolean(),
  room_id: z.string().uuid(),
  room_name: z.string(),
  unarchived_at: z.string(),
});

type ArchivePrecheckResponse = z.infer<typeof ArchivePrecheckResponseSchema>;
type ArchiveResponse = z.infer<typeof ArchiveResponseSchema>;
type UnarchiveResponse = z.infer<typeof UnarchiveResponseSchema>;

// Query hooks
export function useRooms() {
  return useQuery({
    queryKey: keys.rooms.list(),
    queryFn: async () => {
      try {
        const data = await get(API_ENDPOINTS.rooms);
        const parsed = RoomsListResponseSchema.parse(data);
        return parsed;
      } catch (error) {
        console.error('❌ useRooms: Error:', error);
        throw error;
      }
    },
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

// Archive-related hooks
export function useArchivePrecheck(roomId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: keys.rooms.archiveCheck(roomId),
    queryFn: () => get(API_ENDPOINTS.archiveCheck(roomId)).then(data => ArchivePrecheckResponseSchema.parse(data)),
    enabled: !!roomId && (options?.enabled !== false),
    staleTime: 1000 * 30, // 30 seconds - should be fresh for archive operations
  });
}

export function useArchiveRoom() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ roomId, reason }: { roomId: string; reason?: string }) =>
      post(API_ENDPOINTS.archiveConfirm(roomId), { reason }).then(data => ArchiveResponseSchema.parse(data)),
    onSuccess: (data) => {
      // Invalidate related data
      const roomId = data.room_id;
      invalidationHelpers.room(roomId).forEach(key => {
        queryClient.invalidateQueries({ queryKey: key });
      });
      // Also invalidate archive check
      queryClient.invalidateQueries({ queryKey: keys.rooms.archiveCheck(roomId) });
      
      toast({
        title: 'Room Archived',
        description: `${data.room_name} has been archived successfully`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Archive Failed',
        description: error?.data?.message || 'Failed to archive room',
        variant: 'destructive',
      });
    },
  });
}

export function useUnarchiveRoom() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (roomId: string) =>
      post(API_ENDPOINTS.unarchiveRoom(roomId)).then(data => UnarchiveResponseSchema.parse(data)),
    onSuccess: (data) => {
      // Invalidate related data
      const roomId = data.room_id;
      invalidationHelpers.room(roomId).forEach(key => {
        queryClient.invalidateQueries({ queryKey: key });
      });
      // Also invalidate archive check
      queryClient.invalidateQueries({ queryKey: keys.rooms.archiveCheck(roomId) });
      
      toast({
        title: 'Room Reactivated',
        description: `${data.room_name} has been reactivated successfully`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Reactivation Failed',
        description: error?.data?.message || 'Failed to reactivate room',
        variant: 'destructive',
      });
    },
  });
}