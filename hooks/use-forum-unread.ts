import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post} from '@/lib/api';

// Query keys
export const forumUnreadKeys = {
  unread: (roomId: string) => ['forum-unread', roomId] as const,
} as const;

interface UnreadCounts {
  [topic: string]: number;
}

interface ForumUnreadResponse {
  unreadCounts: UnreadCounts;
  totalUnread: number;
  lastForumVisit: string;
}

// Hook to get unread message counts
export function useForumUnread(roomId: string) {
  return useQuery({
    queryKey: forumUnreadKeys.unread(roomId),
    queryFn: () => get<ForumUnreadResponse>(`/api/rooms/${roomId}/forum/unread`),
    enabled: !!roomId,
    staleTime: 1000 * 30, // 30 seconds - refresh frequently for real-time feel
    refetchInterval: 1000 * 60, // Refetch every minute
  });
}

// Hook to mark forum as read
export function useMarkForumAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (roomId: string) => {
      return post(`/api/rooms/${roomId}/forum/unread`, {});
    },
    onSuccess: (_, roomId) => {
      // Invalidate and refetch unread counts
      queryClient.invalidateQueries({ queryKey: forumUnreadKeys.unread(roomId) });
    },
  });
}
