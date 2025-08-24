import { useQuery } from '@tanstack/react-query';
import { get, API_ENDPOINTS } from '@/lib/api';
import { useMembers } from '@/hooks/use-members';

// Query keys
export const userKeys = {
  profile: ['user', 'profile'] as const,
} as const;

// Hook to get current user profile including role
export function useCurrentUser() {
  return useQuery({
    queryKey: userKeys.profile,
    queryFn: () => get(API_ENDPOINTS.profile),
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1, // Only retry once for auth issues
  });
}

// Hook to get current user role specifically
export function useUserRole(): 'admin' | 'lr' | 'member' | null {
  const { data } = useCurrentUser();

  console.log('role', data?.profile?.role);
  return data?.profile?.role || null;
}

// Hook to check if user is admin
export function useIsAdmin(): boolean {
  const role = useUserRole();
  return role === 'admin';
}

// Hook to check if user can archive rooms (admin or LR) - DEPRECATED: Use useCanArchiveRoom instead
export function useCanArchiveRooms(): boolean {
  const role = useUserRole();
  return role === 'admin' || role === 'lr';
}

// Hook to get current user's role in a specific room
export function useRoomMemberRole(roomId: string): 'admin' | 'lr' | 'member' | null {
  const { data } = useMembers(roomId);
  return data?.currentUserRole || null;
}

// Hook to check if user can archive a specific room (room admin or LR)
export function useCanArchiveRoom(roomId: string): boolean {
  const { data } = useMembers(roomId);
  const roomRole = data?.currentUserRole;
  return roomRole === 'admin' || roomRole === 'lr';
}

// Hook to check if user is room admin (for unarchive operations)
export function useIsRoomAdmin(roomId: string): boolean {
  const { data } = useMembers(roomId);
  const roomRole = data?.currentUserRole;
  return roomRole === 'admin';
}