import { QueryClient } from '@tanstack/react-query';
import { keys } from '@/lib/query-keys';
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase';
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

    // Use admin client to completely bypass RLS and avoid stack depth issues
    const adminSupabase = createAdminSupabase();
    
    // Get rooms with minimal data first
    const { data: rooms, error } = await adminSupabase
      .from('mbdf_room')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error prefetching rooms:', error);
      return;
    }

    // Get all related data separately using admin client
    const roomsWithDetails = await Promise.all((rooms || []).map(async (room: any) => {
      // Get substance
      const { data: substance } = await adminSupabase
        .from('substance')
        .select('id, name, cas_number, ec_number')
        .eq('id', room.substance_id)
        .single();
      
      // Get creator profile
      const { data: created_by_profile } = await adminSupabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('id', room.created_by)
        .single();
      
      // Get member count
      const { count } = await adminSupabase
        .from('mbdf_member')
        .select('*', { count: 'exact', head: true })
        .eq('room_id', room.id);
      
      return {
        ...room,
        substance: substance || null,
        created_by_profile: created_by_profile || null,
        member_count: count || 0
      };
    }));

    // Return response without validation to avoid stack depth issues
    const response = {
      items: roomsWithDetails,
      total: roomsWithDetails.length,
    };

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

    // Use admin client to bypass RLS
    const adminSupabase = createAdminSupabase();

    // Get room basic data using admin client
    const { data: room, error } = await adminSupabase
      .from('mbdf_room')
      .select('*')
      .eq('id', roomId)
      .single() as { data: any; error: any };

    if (error) {
      console.error('Error prefetching room:', error);
      return;
    }

    // Get related data separately to avoid stack depth issues
    const [substanceResult, profileResult, memberCountResult] = await Promise.all([
      adminSupabase
        .from('substance')
        .select('*')
        .eq('id', room.substance_id)
        .single(),
      adminSupabase
        .from('profiles')
        .select('*')
        .eq('id', room.created_by)
        .single(),
      adminSupabase
        .from('mbdf_member')
        .select('*', { count: 'exact', head: true })
        .eq('room_id', roomId)
    ]);

    const roomWithCount = {
      ...room,
      substance: substanceResult.data || null,
      created_by_profile: profileResult.data || null,
      member_count: memberCountResult.count || 0,
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