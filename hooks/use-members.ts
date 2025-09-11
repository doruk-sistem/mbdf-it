import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { keys, invalidationHelpers } from '@/lib/query-keys';
import { get, post, put, del, API_ENDPOINTS, withQuery } from '@/lib/api';
import { 
  MemberWithProfile,
  MembersListResponseSchema 
} from '@/lib/schemas';
import { useToast } from '@/components/ui/use-toast';
import { getRoomMembers } from '@/app/actions/rooms';
import type { Database } from '@/types/supabase';

// Types
export interface MembersListResponse {
  items: MemberWithProfile[];
  total: number;
  currentUserRole: Database['public']['Enums']['user_role'];
}

// Query hooks
export function useMembers(roomId: string) {
  return useQuery<MembersListResponse>({
    queryKey: keys.members.list(roomId),
    queryFn: async () => {
      const data = await getRoomMembers(roomId);
      return {
        items: data.members,
        total: data.members.length,
        currentUserRole: data.currentUserRole
      };
    },
    enabled: !!roomId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

export function useMyMembership(roomId: string, userId: string) {
  return useQuery({
    queryKey: keys.members.byUserId(userId),
    queryFn: () => get(withQuery(API_ENDPOINTS.members, { roomId, userId })),
    enabled: !!roomId && !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Mutation hooks
export function useAddMember() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: { roomId: string; userEmail: string; role: 'member' | 'lr' | 'admin' }) => 
      post(API_ENDPOINTS.members, {
        roomId: data.roomId,
        userEmail: data.userEmail,
        role: data.role,
      }),
    onSuccess: (data, variables) => {
      // Invalidate member-related queries
      invalidationHelpers.member(variables.roomId).forEach(key => {
        queryClient.invalidateQueries({ queryKey: key });
      });
      
      toast({
        title: 'Başarılı',
        description: 'Üye başarıyla odaya eklendi.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Hata',
        description: error?.data?.message || 'Üye eklenirken bir hata oluştu',
        variant: 'destructive',
      });
    },
  });
}

export function useJoinRoom() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: { roomId: string; role?: 'member' | 'lr' | 'admin' }) => 
      post(API_ENDPOINTS.members, {
        room_id: data.roomId,
        role: data.role || 'member',
      }),
    onSuccess: (data, variables) => {
      // Invalidate member-related queries
      invalidationHelpers.member(variables.roomId).forEach(key => {
        queryClient.invalidateQueries({ queryKey: key });
      });
      
      toast({
        title: 'Success',
        description: 'Joined room successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error?.data?.message || 'Failed to join room',
        variant: 'destructive',
      });
    },
  });
}

export function useLeaveRoom() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: { roomId: string; userId?: string }) => {
      const endpoint = data.userId 
        ? `${API_ENDPOINTS.members}/${data.userId}`
        : API_ENDPOINTS.members;
      return del(withQuery(endpoint, { roomId: data.roomId }));
    },
    onSuccess: (data, variables) => {
      // Invalidate member-related queries
      invalidationHelpers.member(variables.roomId, variables.userId).forEach(key => {
        queryClient.invalidateQueries({ queryKey: key });
      });
      
      toast({
        title: 'Success',
        description: 'Left room successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error?.data?.message || 'Failed to leave room',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateMemberRole() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: { 
      memberId: string; 
      roomId: string; 
      role: 'admin' | 'lr' | 'member' 
    }) => 
      put(`${API_ENDPOINTS.members}/${data.memberId}/role`, {
        role: data.role,
      }),
    onSuccess: (data, variables) => {
      // Invalidate member-related queries
      invalidationHelpers.member(variables.roomId).forEach(key => {
        queryClient.invalidateQueries({ queryKey: key });
      });
      
      toast({
        title: 'Success',
        description: 'Member role updated successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error?.data?.message || 'Failed to update member role',
        variant: 'destructive',
      });
    },
  });
}