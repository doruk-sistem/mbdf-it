import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase';
import { z } from 'zod';

interface RouteParams {
  params: {
    roomId: string;
  };
}

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

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const supabase = createServerSupabase();
    const { roomId } = params;
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', success: false },
        { status: 401 }
      );
    }

    const adminSupabase = createAdminSupabase();

    // Check if user is admin or LR of the room
    const { data: membership, error: memberError } = await adminSupabase
      .from('mbdf_member')
      .select('role')
      .eq('room_id', roomId)
      .eq('user_id', user.id)
      .single() as { data: any; error: any };

    if (memberError || !membership || !['admin', 'lr'].includes(membership.role)) {
      return NextResponse.json(
        { error: 'Access denied: Admin or LR role required', success: false },
        { status: 403 }
      );
    }

    // Get room basic data
    const { data: room, error: roomError } = await adminSupabase
      .from('mbdf_room')
      .select(`
        id,
        name,
        status,
        substance:substance_id(ec_number, cas_number)
      `)
      .eq('id', roomId)
      .single() as { data: any; error: any };

    if (roomError) {
      if (roomError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Room not found', success: false },
          { status: 404 }
        );
      }
      
      console.error('Error fetching room:', roomError);
      return NextResponse.json(
        { error: 'Failed to fetch room', success: false },
        { status: 500 }
      );
    }

    // Check if room is already archived
    if (room.status === 'archived') {
      return NextResponse.json(
        { error: 'Room is already archived', success: false },
        { status: 409 }
      );
    }

    // Get package IDs first
    const { data: packages } = await adminSupabase
      .from('access_package')
      .select('id')
      .eq('room_id', roomId) as { data: Array<{ id: string }> | null };

    const packageIds = packages?.map(p => p.id) || [];

    // Get counts of various entities that will be affected
    const [
      pendingRequestsResult,
      approvedRequestsResult, 
      openVotesResult,
      draftAgreementsResult,
      totalMembersResult
    ] = await Promise.all([
      // Count pending access requests
      adminSupabase
        .from('access_request')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')
        .in('package_id', packageIds),
      
      // Count approved access requests
      adminSupabase
        .from('access_request')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved')
        .in('package_id', packageIds),
      
      // Count open LR votes (where voting is still ongoing)
      adminSupabase
        .from('lr_vote')
        .select('*', { count: 'exact', head: true })
        .eq('room_id', roomId),
      
      // Count draft agreements (assuming status field exists)
      adminSupabase
        .from('agreement')
        .select('*', { count: 'exact', head: true })
        .eq('room_id', roomId),
      
      // Count total members
      adminSupabase
        .from('mbdf_member')
        .select('*', { count: 'exact', head: true })
        .eq('room_id', roomId)
    ]);

    const counts = {
      pending_requests: pendingRequestsResult.count || 0,
      approved_requests: approvedRequestsResult.count || 0,
      open_votes: openVotesResult.count || 0,
      draft_agreements: draftAgreementsResult.count || 0,
      total_members: totalMembersResult.count || 0,
    };

    const effects = {
      pending_will_be_rejected: counts.pending_requests,
      approved_will_be_revoked: counts.approved_requests,
      votes_will_be_closed: counts.open_votes,
    };

    // Determine if archiving is allowed and collect reasons if not
    const reasons: string[] = [];
    let canArchive = true;

    // Add any business rules that would prevent archiving
    // (Currently no blocking rules, but this is where they would go)

    const response = {
      room: {
        id: room.id,
        name: room.name,
        status: room.status,
        substance: room.substance,
      },
      counts,
      effects,
      can_archive: canArchive,
      reasons,
    };

    // Validate response
    const validatedResponse = ArchivePrecheckResponseSchema.parse(response);

    return NextResponse.json(validatedResponse);
  } catch (error) {
    console.error('API Error in GET /api/rooms/[roomId]/archive/check:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid response format', details: error.issues, success: false },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error', success: false },
      { status: 500 }
    );
  }
}