import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase';
import { z } from 'zod';

// Validation schemas
const UpdateJoinRequestSchema = z.object({
  status: z.enum(['approved', 'rejected', 'cancelled']),
  decisionNote: z.string().optional(),
});

interface RouteParams {
  params: { id: string };
}

// PUT /api/join-requests/[id] - Update join request status
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
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
    const validatedData = UpdateJoinRequestSchema.parse(body);

    // Get the join request using admin client to bypass RLS
    const adminSupabase = createAdminSupabase();
    const { data: joinRequest, error: requestError } = await (adminSupabase as any)
      .from('join_request')
      .select(`
        *,
        mbdf_room:mbdf_room_id (
          id,
          name,
          status
        )
      `)
      .eq('request_id', params.id)
      .single();

    if (requestError || !joinRequest) {
      return NextResponse.json(
        { error: 'Join request not found', success: false },
        { status: 404 }
      );
    }

    // Check if room is archived
    if (joinRequest.mbdf_room?.status === 'archived') {
      return NextResponse.json(
        { error: 'Cannot modify requests for archived room', success: false },
        { status: 400 }
      );
    }

    // Check permissions
    if (validatedData.status === 'cancelled') {
      // Only the requester can cancel their own request
      if (joinRequest.requested_by !== user.id) {
        return NextResponse.json(
          { error: 'Access denied', success: false },
          { status: 403 }
        );
      }
    } else {
      // Check if user is a member of the room
      const { data: membership, error: memberError } = await supabase
        .from('mbdf_member')
        .select('role')
        .eq('room_id', joinRequest.mbdf_room_id)
        .eq('user_id', user.id)
        .single();

      if (memberError || !membership) {
        return NextResponse.json(
          { error: 'Access denied - Room membership required', success: false },
          { status: 403 }
        );
      }

      // Check if there's a leader in the room
      const { data: leaderExists } = await supabase
        .from('mbdf_member')
        .select('id')
        .eq('room_id', joinRequest.mbdf_room_id)
        .eq('role', 'lr')
        .single();

      // If there's a leader, only the leader can approve/reject
      // If no leader, all members can approve/reject
      if (leaderExists && membership.role !== 'lr') {
        return NextResponse.json(
          { error: 'Access denied - Only the leader can manage join requests when a leader exists', success: false },
          { status: 403 }
        );
      }
    }

    // Update the join request
    const updateData: any = {
      status: validatedData.status,
      decided_at: new Date().toISOString(),
    };

    if (validatedData.status !== 'cancelled') {
      updateData.decision_by = user.id;
      updateData.decision_note = validatedData.decisionNote;
    }

    const { data: updatedRequest, error: updateError } = await (adminSupabase as any)
      .from('join_request')
      .update(updateData)
      .eq('request_id', params.id)
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
      .single();

    if (updateError) {
      console.error('Error updating join request:', updateError);
      return NextResponse.json(
        { error: 'Failed to update join request', success: false },
        { status: 500 }
      );
    }

    // If approved, add the user to the room
    if (validatedData.status === 'approved') {
      const { error: addMemberError } = await (adminSupabase as any)
        .from('mbdf_member')
        .insert({
          room_id: joinRequest.mbdf_room_id,
          user_id: joinRequest.requested_by,
          role: 'member'
        });

      if (addMemberError) {
        console.error('Error adding member to room:', addMemberError);
        // Don't fail the request, just log the error
      }
    }

    return NextResponse.json({ request: updatedRequest, success: true });
  } catch (error) {
    console.error('API Error in PUT /api/join-requests/[id]:', error);
    
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

// DELETE /api/join-requests/[id] - Delete join request (cancel)
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
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

    // Get the join request
    const { data: joinRequest, error: requestError } = await supabase
      .from('join_request')
      .select('requested_by, status')
      .eq('request_id', params.id)
      .single();

    if (requestError || !joinRequest) {
      return NextResponse.json(
        { error: 'Join request not found', success: false },
        { status: 404 }
      );
    }

    // Only the requester can delete their own pending request
    if (joinRequest.requested_by !== user.id || joinRequest.status !== 'pending') {
      return NextResponse.json(
        { error: 'Access denied', success: false },
        { status: 403 }
      );
    }

    // Delete the join request
    const { error: deleteError } = await supabase
      .from('join_request')
      .delete()
      .eq('request_id', params.id);

    if (deleteError) {
      console.error('Error deleting join request:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete join request', success: false },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API Error in DELETE /api/join-requests/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error', success: false },
      { status: 500 }
    );
  }
}
