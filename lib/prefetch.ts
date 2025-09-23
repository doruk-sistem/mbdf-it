import { QueryClient } from '@tanstack/react-query';
import { keys } from '@/lib/query-keys';
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase';
import { 
  RoomsListResponseSchema,
  DocumentsListResponseSchema,
  MembersListResponseSchema,
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

    // User already defined above, no need to redefine

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
      
      // Get user membership and role
      const { data: userMembership } = await adminSupabase
        .from('mbdf_member')
        .select('role')
        .eq('room_id', room.id)
        .eq('user_id', user.id)
        .single();
      
      return {
        ...room,
        substance: substance || null,
        created_by_profile: created_by_profile || null,
        member_count: count || 0,
        is_member: !!userMembership,
        user_role: (userMembership as any)?.role || null
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

    // Allow all authenticated users to access documents
    // No membership check needed - all users can access documents

    // Fetch documents using admin client to bypass RLS
    const adminSupabase = createAdminSupabase();
    const { data: documents, error } = await adminSupabase
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

    // Create signed URLs for documents (server-side) and normalize path if needed
    const documentsWithUrls = await Promise.all(
      (documents || []).map(async (doc: any) => {
        try {
          const storagePath = doc.file_path?.startsWith('docs/')
            ? doc.file_path.replace(/^docs\//, '')
            : doc.file_path;

          const { data: signedUrlData, error: urlError } = await supabase.storage
            .from('docs')
            .createSignedUrl(storagePath, 3600);

          return {
            ...doc,
            download_url: urlError ? null : signedUrlData.signedUrl,
          };
        } catch {
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
    prefetchVotes(queryClient, roomId),
  ]);
}

/**
 * Prefetch dashboard data
 */
export async function prefetchDashboard(queryClient: QueryClient) {
  const supabase = createServerSupabase();
  
  try {
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return;
    }

    // Prefetch all dashboard data in parallel
    await Promise.all([
      prefetchRooms(queryClient),
      prefetchUserDocuments(queryClient, user.id),
      prefetchUserActivities(queryClient, user.id),
      prefetchUserKKS(queryClient, user.id)
    ]);
  } catch (error) {
    console.error('Error in prefetchDashboard:', error);
  }
}

/**
 * Prefetch user documents
 */
export async function prefetchUserDocuments(queryClient: QueryClient, userId: string) {
  try {
    const adminSupabase = createAdminSupabase();
    
    const { data: documents, error } = await adminSupabase
      .from('document')
      .select(`
        id,
        name,
        created_at,
        room_id,
        mbdf_room:room_id (
          id,
          name,
          substance:substance_id (
            name
          )
        )
      `)
      .eq('uploaded_by', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error prefetching user documents:', error);
      return;
    }

    const response = {
      items: documents || [],
      total: documents?.length || 0,
    };

    await queryClient.prefetchQuery({
      queryKey: ['documents', 'byUserId', userId],
      queryFn: () => Promise.resolve(response),
      staleTime: 1000 * 60 * 2, // 2 minutes
    });
  } catch (error) {
    console.error('Error in prefetchUserDocuments:', error);
  }
}

/**
 * Prefetch user activities
 */
export async function prefetchUserActivities(queryClient: QueryClient, userId: string) {
  try {
    const adminSupabase = createAdminSupabase();
    
    // Get recent activities (limit 5)
    const activities: any[] = [];
    
    // 1. Get rooms created by user
    const { data: createdRooms } = await adminSupabase
      .from('mbdf_room')
      .select(`
        id,
        name,
        created_at,
        substance:substance_id (name)
      `)
      .eq('created_by', userId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (createdRooms) {
      createdRooms.forEach((room: any) => {
        activities.push({
          id: `room-${room.id}`,
          action: 'Yeni MBDF odası oluşturdunuz',
          user: 'Sen',
          room: room.substance?.name || room.name || 'Bilinmeyen',
          roomId: room.id,
          time: getTimeAgo(room.created_at),
          type: 'Oluşturma',
          timestamp: new Date(room.created_at).getTime()
        });
      });
    }

    // 2. Get documents uploaded by user
    const { data: uploadedDocs } = await adminSupabase
      .from('document')
      .select(`
        id,
        name,
        created_at,
        room_id,
        mbdf_room:room_id (
          id,
          name,
          substance:substance_id (name)
        )
      `)
      .eq('uploaded_by', userId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (uploadedDocs) {
      uploadedDocs.forEach((doc: any) => {
        activities.push({
          id: `doc-${doc.id}`,
          action: 'Belge yüklediniz',
          user: 'Sen',
          room: doc.mbdf_room?.substance?.name || doc.mbdf_room?.name || 'Bilinmeyen',
          roomId: doc.room_id,
          documentId: doc.id,
          time: getTimeAgo(doc.created_at),
          type: 'Belge',
          timestamp: new Date(doc.created_at).getTime()
        });
      });
    }

    // Sort by timestamp and take first 5
    activities.sort((a, b) => b.timestamp - a.timestamp);
    const recentActivities = activities.slice(0, 5);

    const response = {
      items: recentActivities,
      total: recentActivities.length,
    };

    await queryClient.prefetchQuery({
      queryKey: ['activities', 'recent'],
      queryFn: () => Promise.resolve(response),
      staleTime: 1000 * 60 * 2, // 2 minutes
    });
  } catch (error) {
    console.error('Error in prefetchUserActivities:', error);
  }
}

/**
 * Prefetch user KKS submissions
 */
export async function prefetchUserKKS(queryClient: QueryClient, userId: string) {
  try {
    const adminSupabase = createAdminSupabase();
    
    const { data: kks, error } = await adminSupabase
      .from('kks_submission')
      .select(`
        id,
        title,
        created_at,
        mbdf_room:room_id (
          id,
          name,
          substance:substance_id (name)
        )
      `)
      .eq('created_by', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error prefetching user KKS:', error);
      return;
    }

    const response = {
      items: kks || [],
      total: kks?.length || 0,
    };

    await queryClient.prefetchQuery({
      queryKey: ['kks', 'byUserId', userId],
      queryFn: () => Promise.resolve(response),
      staleTime: 1000 * 60 * 2, // 2 minutes
    });
  } catch (error) {
    console.error('Error in prefetchUserKKS:', error);
  }
}

// Helper function for time ago
function getTimeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'Az önce';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} dakika önce`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} saat önce`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} gün önce`;
  return date.toLocaleDateString('tr-TR');
}