import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, del, API_ENDPOINTS, withQuery } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';

interface MessageWithProfile {
  id: string;
  content: string;
  is_pinned: boolean;
  thread_id: string | null;
  created_at: string;
  updated_at: string | null;
  profiles: {
    full_name: string | null;
    email: string;
    avatar_url: string | null;
    company: {
      name: string;
    } | null;
  } | null;
  parent_message?: MessageWithProfile | null;
}

// Query hooks
export function useMessages(roomId: string) {
  return useQuery({
    queryKey: ['messages', roomId],
    queryFn: () => get<{ items: MessageWithProfile[] }>(withQuery(API_ENDPOINTS.messages, { roomId })),
    enabled: !!roomId,
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: 1000 * 60, // Refetch every minute to get new messages
  });
}

// Mutation hooks
export function useSendMessage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: {
      roomId: string;
      content: string;
      thread_id?: string | null;
    }) => post(API_ENDPOINTS.messages, {
      room_id: data.roomId,
      content: data.content,
      thread_id: data.thread_id,
    }),
    onSuccess: (data, variables) => {
      // Invalidate messages for the room
      queryClient.invalidateQueries({ queryKey: ['messages', variables.roomId] });
      toast({
        title: 'Başarılı',
        description: 'Mesaj gönderildi',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Hata',
        description: error?.data?.message || 'Mesaj gönderilemedi',
        variant: 'destructive',
      });
    },
  });
}

export function usePinMessage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ messageId, isPinned }: { messageId: string; isPinned: boolean }) =>
      post(`${API_ENDPOINTS.message(messageId)}/pin`, { is_pinned: !isPinned }),
    onSuccess: (data, variables) => {
      // Invalidate all messages queries as we don't know the roomId here
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      toast({
        title: 'Başarılı',
        description: variables.isPinned ? 'Mesaj sabitleme kaldırıldı' : 'Mesaj sabitlendi',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Hata',
        description: error?.data?.message || 'İşlem başarısız',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteMessage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (messageId: string) => del(API_ENDPOINTS.message(messageId)),
    onSuccess: () => {
      // Invalidate all messages queries as we don't know the roomId here
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      toast({
        title: 'Başarılı',
        description: 'Mesaj silindi',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Hata',
        description: error?.data?.message || 'Mesaj silinemedi',
        variant: 'destructive',
      });
    },
  });
}
