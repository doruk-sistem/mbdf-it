import { QueryClient } from '@tanstack/react-query';
import { keys } from '@/lib/query-keys';
import { createServerSupabase } from '@/lib/supabase';
import { 
  RoomsListResponseSchema,
  DocumentsListResponseSchema,
  MembersListResponseSchema,
  AccessRequestsListResponseSchema,
  VotingSummaryResponseSchema,
  RoomWithDetailsSchema 
} from '@/lib/schemas';

/**
 * Server-side prefetch utilities for SSR
 * These functions should be called in server components or getServerSideProps
 */

export async function prefetchRooms(queryClient: QueryClient) {
  const supabase = createServerSupabase();
  
  try {
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return;
    }

    // Fetch rooms with details (same logic as API route)
    const { data: rooms, error } = await supabase
      .from('mbdf_room')
      .select(`
        *,
        substance (*),
        created_by_profile:profiles!mbdf_room_created_by_fkey (*),
        mbdf_member (count)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error prefetching rooms:', error);
      return;
    }

    const roomsWithCount = (rooms || []).map(room => ({
      ...room,
      member_count: Array.isArray(room.mbdf_member) ? room.mbdf_member.length : 0
    }));

    const response = RoomsListResponseSchema.parse({
      items: roomsWithCount,
      total: roomsWithCount.length,
    });

    await queryClient.prefetchQuery({
      queryKey: keys.rooms.list(),
      queryFn: () => Promise.resolve(response),
      staleTime: 1000 * 60 * 5, // 5 minutes
    });
  } catch (error) {
    console.error('Error in prefetchRooms:', error);
  }
}

export async function prefetchRoom(queryClient: QueryClient, roomId: string) {
  const supabase = createServerSupabase();
  
  try {
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return;
    }

    // Check membership
    const { data: membership, error: memberError } = await supabase
      .from('mbdf_member')
      .select('id')
      .eq('room_id', roomId)
      .eq('user_id', user.id)
      .single();

    if (memberError) {
      return;
    }

    // Fetch room details
    const { data: room, error } = await supabase
      .from('mbdf_room')
      .select(`
        *,
        substance (*),
        created_by_profile:profiles!mbdf_room_created_by_fkey (*),
        mbdf_member (count)
      `)
      .eq('id', roomId)
      .single();

    if (error) {
      console.error('Error prefetching room:', error);
      return;
    }

    const roomWithCount = {
      ...room,
      member_count: Array.isArray(room.mbdf_member) ? room.mbdf_member.length : 0,
    };

    const validatedRoom = RoomWithDetailsSchema.parse(roomWithCount);

    await queryClient.prefetchQuery({
      queryKey: keys.rooms.byId(roomId),
      queryFn: () => Promise.resolve(validatedRoom),
      staleTime: 1000 * 60 * 5, // 5 minutes
    });
  } catch (error) {
    console.error('Error in prefetchRoom:', error);
  }
}

export async function prefetchDocuments(queryClient: QueryClient, roomId: string) {
  const supabase = createServerSupabase();
  
  try {
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return;
    }

    // Check membership
    const { data: membership, error: memberError } = await supabase
      .from('mbdf_member')
      .select('id')
      .eq('room_id', roomId)
      .eq('user_id', user.id)
      .single();

    if (memberError) {
      return;
    }

    // Fetch documents
    const { data: documents, error } = await supabase
      .from('document')
      .select(`
        *,
        profiles:uploaded_by (*)
      `)
      .eq('room_id', roomId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error prefetching documents:', error);
      return;
    }

    // Create signed URLs for documents (server-side)
    const documentsWithUrls = await Promise.all(
      (documents || []).map(async (doc) => {
        try {
          const { data: signedUrlData, error: urlError } = await supabase.storage
            .from('docs')
            .createSignedUrl(doc.file_path, 3600);

          return {
            ...doc,
            download_url: urlError ? null : signedUrlData.signedUrl,
          };
        } catch (urlError) {
          return {
            ...doc,
            download_url: null,
          };
        }
      })
    );

    const response = DocumentsListResponseSchema.parse({
      items: documentsWithUrls,
      total: documentsWithUrls.length,
    });

    await queryClient.prefetchQuery({
      queryKey: keys.documents.list(roomId),
      queryFn: () => Promise.resolve(response),
      staleTime: 1000 * 60 * 2, // 2 minutes
    });
  } catch (error) {
    console.error('Error in prefetchDocuments:', error);
  }
}

export async function prefetchMembers(queryClient: QueryClient, roomId: string) {
  const supabase = createServerSupabase();
  
  try {
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return;
    }

    // Check membership
    const { data: membership, error: memberError } = await supabase
      .from('mbdf_member')
      .select('id')
      .eq('room_id', roomId)
      .eq('user_id', user.id)
      .single();

    if (memberError) {
      return;
    }

    // Fetch members with profiles
    const { data: members, error } = await supabase
      .from('mbdf_member')
      .select(`
        *,
        profiles!mbdf_member_user_id_fkey (
          *,
          company (*)
        )
      `)
      .eq('room_id', roomId)
      .order('joined_at', { ascending: true });

    if (error) {
      console.error('Error prefetching members:', error);
      return;
    }

    const response = MembersListResponseSchema.parse({
      items: members || [],
      total: members?.length || 0,
    });

    await queryClient.prefetchQuery({
      queryKey: keys.members.list(roomId),
      queryFn: () => Promise.resolve(response),
      staleTime: 1000 * 60 * 2, // 2 minutes
    });
  } catch (error) {
    console.error('Error in prefetchMembers:', error);
  }
}

export async function prefetchAccessRequests(queryClient: QueryClient, roomId: string) {
  const supabase = createServerSupabase();
  
  try {
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return;
    }

    // Check membership
    const { data: membership, error: memberError } = await supabase
      .from('mbdf_member')
      .select('role')
      .eq('room_id', roomId)
      .eq('user_id', user.id)
      .single();

    if (memberError) {
      return;
    }

    // Fetch access requests
    const { data: requests, error } = await supabase
      .from('access_request')
      .select(`
        *,
        access_package!inner (*),
        profiles:requester_id (*),
        approved_by_profile:profiles!access_request_approved_by_fkey (*)
      `)
      .eq('access_package.room_id', roomId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error prefetching access requests:', error);
      return;
    }

    const response = AccessRequestsListResponseSchema.parse({
      items: requests || [],
      total: requests?.length || 0,
    });

    await queryClient.prefetchQuery({
      queryKey: keys.accessRequests.list(roomId),
      queryFn: () => Promise.resolve(response),
      staleTime: 1000 * 30, // 30 seconds
    });
  } catch (error) {
    console.error('Error in prefetchAccessRequests:', error);
  }
}

export async function prefetchVotes(queryClient: QueryClient, roomId: string) {
  const supabase = createServerSupabase();
  
  try {
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return;
    }

    // Check membership
    const { data: membership, error: memberError } = await supabase
      .from('mbdf_member')
      .select('id')
      .eq('room_id', roomId)
      .eq('user_id', user.id)
      .single();

    if (memberError) {
      return;
    }

    // Get voting results and user's vote
    const [votingResults, myVote, roomData] = await Promise.all([
      supabase.rpc('get_voting_results', { room_id_param: roomId }),
      supabase
        .from('lr_vote')
        .select('*')
        .eq('room_id', roomId)
        .eq('voter_id', user.id)
        .single(),
      supabase
        .from('mbdf_room')
        .select('status')
        .eq('id', roomId)
        .single()
    ]);

    if (votingResults.error) {
      console.error('Error prefetching voting results:', votingResults.error);
      return;
    }

    const response = VotingSummaryResponseSchema.parse({
      results: votingResults.data || [],
      my_vote: myVote.error ? null : myVote.data,
      is_finalized: roomData.data?.status === 'closed',
    });

    await queryClient.prefetchQuery({
      queryKey: keys.votes.summary(roomId),
      queryFn: () => Promise.resolve(response),
      staleTime: 1000 * 30, // 30 seconds
    });
  } catch (error) {
    console.error('Error in prefetchVotes:', error);
  }
}

/**
 * Prefetch all room-related data at once
 */
export async function prefetchRoomData(queryClient: QueryClient, roomId: string) {
  await Promise.all([
    prefetchRoom(queryClient, roomId),
    prefetchDocuments(queryClient, roomId),
    prefetchMembers(queryClient, roomId),
    prefetchAccessRequests(queryClient, roomId),
    prefetchVotes(queryClient, roomId),
  ]);
}

/**
 * Prefetch dashboard data
 */
export async function prefetchDashboard(queryClient: QueryClient) {
  await prefetchRooms(queryClient);
}