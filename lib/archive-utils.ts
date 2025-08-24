/**
 * Utility functions for handling archived room state
 */

export interface RoomStatus {
  status: 'active' | 'closed' | 'archived';
  archived_at?: string | null;
  archive_reason?: string | null;
  archive_initiated_by?: string | null;
}

/**
 * Check if a room is archived
 */
export function isRoomArchived(room: RoomStatus): boolean {
  return room.status === 'archived';
}

/**
 * Check if a room allows write operations
 */
export function canWriteToRoom(room: RoomStatus): boolean {
  return room.status !== 'archived';
}

/**
 * Get user-friendly status text for a room
 */
export function getRoomStatusText(status: 'active' | 'closed' | 'archived'): string {
  switch (status) {
    case 'active':
      return 'Aktif';
    case 'closed':
      return 'Kapalı';
    case 'archived':
      return 'Arşivlenmiş';
    default:
      return 'Bilinmiyor';
  }
}

/**
 * Get appropriate badge variant for room status
 */
export function getRoomStatusVariant(status: 'active' | 'closed' | 'archived'): 'default' | 'secondary' | 'destructive' {
  switch (status) {
    case 'active':
      return 'default';
    case 'closed':
      return 'secondary';
    case 'archived':
      return 'destructive';
    default:
      return 'secondary';
  }
}

/**
 * Create a disabled tooltip message for archived room actions
 */
export function getArchivedTooltip(action: string): string {
  return `Bu işlem arşivlenmiş odalarda kullanılamaz: ${action}`;
}

/**
 * Check if user can archive a room (admin or LR)
 */
export function canUserArchiveRoom(userRole: 'admin' | 'lr' | 'member' | null): boolean {
  return userRole === 'admin' || userRole === 'lr';
}

/**
 * Check if user can unarchive a room (only admin)
 */
export function canUserUnarchiveRoom(userRole: 'admin' | 'lr' | 'member' | null): boolean {
  return userRole === 'admin';
}

/**
 * Format archive date for display
 */
export function formatArchiveDate(archivedAt: string | null): string {
  if (!archivedAt) return '';
  
  try {
    const date = new Date(archivedAt);
    return date.toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    return archivedAt;
  }
}

/**
 * Get archive status summary for display
 */
export function getArchiveStatusSummary(room: RoomStatus): {
  isArchived: boolean;
  archivedAt: string;
  reason: string | null | undefined;
  canWrite: boolean;
} {
  return {
    isArchived: isRoomArchived(room),
    archivedAt: room.archived_at ? formatArchiveDate(room.archived_at) : '',
    reason: room.archive_reason,
    canWrite: canWriteToRoom(room)
  };
}