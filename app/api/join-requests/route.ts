import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase';
import { z } from 'zod';

// Validation schemas
const CreateJoinRequestSchema = z.object({
  roomId: z.string().uuid(),
  message: z.string().optional(),
  acceptTerms: z.boolean().default(false),
});

// GET /api/join-requests - Get join requests for a room
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabase();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', success: false },
        { status: 401 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId');
    const userId = searchParams.get('userId');

    if (!roomId && !userId) {
      return NextResponse.json(
        { error: 'roomId or userId parameter is required', success: false },
        { status: 400 }
      );
    }

    // Use admin client for join_request queries to avoid RLS issues
    const adminSupabase = createAdminSupabase();
    let query = adminSupabase
      .from('join_request')
      .select(`
        *,
        profiles:requested_by (
          id,
          full_name,
          email,
          avatar_url,
          company:company_id (
            id,
            name
          )
        ),
        decision_by_profile:profiles!join_request_decision_by_fkey (
          id,
          full_name,
          email
        ),
        mbdf_room:mbdf_room_id (
          id,
          name,
          description
        )
      `)
      .order('created_at', { ascending: false });

    if (roomId) {
      // Check if user has access to this room (must be LR only)
      const { data: membership, error: memberError } = await adminSupabase
        .from('mbdf_member')
        .select('role')
        .eq('room_id', roomId)
        .eq('user_id', user.id)
        .single() as { data: any; error: any };

      if (memberError || !membership || membership.role !== 'lr') {
        return NextResponse.json(
          { error: 'Access denied - LR role required', success: false },
          { status: 403 }
        );
      }

      query = query.eq('mbdf_room_id', roomId);
    }

    if (userId) {
      // User can only see their own requests
      if (userId !== user.id) {
        return NextResponse.json(
          { error: 'Access denied', success: false },
          { status: 403 }
        );
      }
      query = query.eq('requested_by', userId);
    }

    const { data: requests, error } = await query;

    if (error) {
      console.error('Error fetching join requests:', error);
      return NextResponse.json(
        { error: 'Failed to fetch join requests', success: false },
        { status: 500 }
      );
    }

    return NextResponse.json({ requests, success: true });
  } catch (error) {
    console.error('API Error in GET /api/join-requests:', error);
    return NextResponse.json(
      { error: 'Internal server error', success: false },
      { status: 500 }
    );
  }
}

// POST /api/join-requests - Create a new join request
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabase();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', success: false },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = CreateJoinRequestSchema.parse(body);

    // Get user's profile and company
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.company_id) {
      return NextResponse.json(
        { error: 'User profile or company not found', success: false },
        { status: 400 }
      );
    }

    // Check if room exists using admin client to bypass RLS
    const adminSupabase = createAdminSupabase();
    const { data: room, error: roomError } = await adminSupabase
      .from('mbdf_room')
      .select('id, name, status')
      .eq('id', validatedData.roomId)
      .single() as { data: any; error: any };

    if (roomError || !room) {
      return NextResponse.json(
        { error: 'Room not found', success: false },
        { status: 404 }
      );
    }

    // Check if room is archived
    if (room.status === 'archived') {
      return NextResponse.json(
        { error: 'Cannot join archived room', success: false },
        { status: 400 }
      );
    }

    // Check if user is already a member
    const { data: existingMember, error: memberError } = await supabase
      .from('mbdf_member')
      .select('id')
      .eq('room_id', validatedData.roomId)
      .eq('user_id', user.id)
      .single();

    if (existingMember) {
      return NextResponse.json(
        { error: 'You are already a member of this room', success: false },
        { status: 400 }
      );
    }

    // Check if there's already a pending request from this company
    const { data: existingRequest, error: requestError } = await supabase
      .from('join_request')
      .select('id, status')
      .eq('mbdf_room_id', validatedData.roomId)
      .eq('company_id', profile.company_id)
      .eq('status', 'pending')
      .single();

    if (existingRequest) {
      return NextResponse.json(
        { error: 'Your company already has a pending request for this room', success: false },
        { status: 400 }
      );
    }

    // Create join request
    const { data: request_data, error } = await supabase
      .from('join_request')
      .insert([
        {
          mbdf_room_id: validatedData.roomId,
          company_id: profile.company_id,
          requested_by: user.id,
          message: validatedData.message,
          accept_terms: validatedData.acceptTerms,
          status: 'pending',
        },
      ])
      .select(`
        *,
        profiles:requested_by (
          id,
          full_name,
          email,
          avatar_url,
          company:company_id (
            id,
            name
          )
        ),
        mbdf_room:mbdf_room_id (
          id,
          name,
          description
        )
      `)
      .single();

    if (error) {
      console.error('Error creating join request:', error);
      return NextResponse.json(
        { error: 'Failed to create join request', success: false },
        { status: 500 }
      );
    }

    return NextResponse.json({ request: request_data, success: true }, { status: 201 });
  } catch (error) {
    console.error('API Error in POST /api/join-requests:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues, success: false },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error', success: false },
      { status: 500 }
    );
  }
}
