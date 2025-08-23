'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface UseRealtimeInvalidateOptions {
  table: string;
  filter?: string;
  keys: readonly (readonly string[])[];
  enabled?: boolean;
}

/**
 * Hook to invalidate queries when real-time changes occur
 */
export function useRealtimeInvalidate({
  table,
  filter,
  keys,
  enabled = true,
}: UseRealtimeInvalidateOptions) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;

    let channel: RealtimeChannel;

    const setupSubscription = () => {
      channel = supabase.channel(`realtime:${table}:${filter || 'all'}`);

      // Subscribe to INSERT events
      channel.on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table,
          ...(filter && { filter }),
        },
        () => {
          // Invalidate related queries
          keys.forEach(key => {
            queryClient.invalidateQueries({ queryKey: key });
          });
        }
      );

      // Subscribe to UPDATE events
      channel.on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table,
          ...(filter && { filter }),
        },
        () => {
          // Invalidate related queries
          keys.forEach(key => {
            queryClient.invalidateQueries({ queryKey: key });
          });
        }
      );

      // Subscribe to DELETE events
      channel.on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table,
          ...(filter && { filter }),
        },
        () => {
          // Invalidate related queries
          keys.forEach(key => {
            queryClient.invalidateQueries({ queryKey: key });
          });
        }
      );

      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Subscribed to realtime changes for table: ${table}`);
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`Error subscribing to realtime changes for table: ${table}`);
        }
      });
    };

    setupSubscription();

    // Cleanup subscription on unmount
    return () => {
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, [table, filter, keys, enabled, queryClient]);
}

/**
 * Hook for rooms real-time updates
 */
export function useRoomsRealtime(enabled = true) {
  const queryClient = useQueryClient();

  useRealtimeInvalidate({
    table: 'mbdf_room',
    keys: [
      ['rooms'],
      ['rooms', 'list'],
    ],
    enabled,
  });
}

/**
 * Hook for documents real-time updates
 */
export function useDocumentsRealtime(roomId: string, enabled = true) {
  useRealtimeInvalidate({
    table: 'document',
    filter: `room_id=eq.${roomId}`,
    keys: [
      ['documents'],
      ['documents', 'list', roomId],
      ['documents', 'byRoomId', roomId],
    ],
    enabled: enabled && !!roomId,
  });
}

/**
 * Hook for members real-time updates
 */
export function useMembersRealtime(roomId: string, enabled = true) {
  useRealtimeInvalidate({
    table: 'mbdf_member',
    filter: `room_id=eq.${roomId}`,
    keys: [
      ['members'],
      ['members', 'list', roomId],
      ['members', 'byRoomId', roomId],
      ['rooms', 'byId', roomId], // Update room member count
    ],
    enabled: enabled && !!roomId,
  });
}

/**
 * Hook for access requests real-time updates
 */
export function useAccessRequestsRealtime(roomId: string, enabled = true) {
  useRealtimeInvalidate({
    table: 'access_request',
    keys: [
      ['accessRequests'],
      ['accessRequests', 'list', roomId],
      ['packages', 'requests', roomId],
    ],
    enabled: enabled && !!roomId,
  });
}

/**
 * Hook for votes real-time updates
 */
export function useVotesRealtime(roomId: string, enabled = true) {
  useRealtimeInvalidate({
    table: 'lr_vote',
    filter: `room_id=eq.${roomId}`,
    keys: [
      ['votes'],
      ['votes', 'summary', roomId],
      ['votes', 'results', roomId],
      ['votes', 'byRoomId', roomId],
    ],
    enabled: enabled && !!roomId,
  });
}

/**
 * Hook for messages real-time updates
 */
export function useMessagesRealtime(roomId: string, enabled = true) {
  useRealtimeInvalidate({
    table: 'message',
    filter: `room_id=eq.${roomId}`,
    keys: [
      ['messages'],
      ['messages', 'list', roomId],
      ['messages', 'byRoomId', roomId],
    ],
    enabled: enabled && !!roomId,
  });
}

/**
 * Hook for agreements real-time updates
 */
export function useAgreementsRealtime(roomId?: string, enabled = true) {
  const keys = [
    ['agreements'],
    ['agreements', 'list'],
  ];

  if (roomId) {
    keys.push(['agreements', 'byRoomId', roomId]);
  }

  useRealtimeInvalidate({
    table: 'agreement',
    ...(roomId && { filter: `room_id=eq.${roomId}` }),
    keys,
    enabled,
  });
}

/**
 * Hook for KKS submissions real-time updates
 */
export function useKKSRealtime(roomId?: string, enabled = true) {
  const keys = [
    ['kks'],
    ['kks', 'list'],
  ];

  if (roomId) {
    keys.push(['kks', 'byRoomId', roomId]);
  }

  useRealtimeInvalidate({
    table: 'kks_submission',
    ...(roomId && { filter: `room_id=eq.${roomId}` }),
    keys,
    enabled,
  });
}

/**
 * Combined hook for all room-related real-time updates
 */
export function useRoomRealtime(roomId: string, enabled = true) {
  useDocumentsRealtime(roomId, enabled);
  useMembersRealtime(roomId, enabled);
  useAccessRequestsRealtime(roomId, enabled);
  useVotesRealtime(roomId, enabled);
  useMessagesRealtime(roomId, enabled);
  useAgreementsRealtime(roomId, enabled);
  useKKSRealtime(roomId, enabled);
}