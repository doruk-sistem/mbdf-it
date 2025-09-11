import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase';
import { z } from 'zod';

const ResetVotesSchema = z.object({
  room_id: z.string().uuid(),
});

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
    const validatedData = ResetVotesSchema.parse(body);

    // Use admin client to bypass RLS
    const adminSupabase = createAdminSupabase();

    // Check if user is a member of the room
    const { data: membership, error: memberError } = await adminSupabase
      .from('mbdf_member')
      .select('role')
      .eq('room_id', validatedData.room_id)
      .eq('user_id', user.id)
      .single() as { data: { role: string } | null; error: any };

    if (memberError || !membership) {
      return NextResponse.json(
        { error: 'Access denied: You must be a member of this room', success: false },
        { status: 403 }
      );
    }

    // Any room member can reset votes (democratic process)
    // No special admin privileges required

    // Delete all votes for this room
    const { error: deleteError } = await (adminSupabase as any)
      .from('lr_vote')
      .delete()
      .eq('room_id', validatedData.room_id);

    if (deleteError) {
      console.error('Error deleting votes:', deleteError);
      return NextResponse.json(
        { error: 'Failed to reset votes', success: false },
        { status: 500 }
      );
    }

    // Log the action
    const { error: logError } = await adminSupabase
      .from('audit_log')
      .insert({
        room_id: validatedData.room_id,
        user_id: user.id,
        action: 'votes_reset',
        resource_type: 'lr_vote',
        resource_id: null,
        new_values: { 
          reason: 'tie_detected',
          reset_by: user.id
        }
      } as any);

    if (logError) {
      console.error('Error logging action:', logError);
      // Don't throw error for logging failure, just log it
    }

    return NextResponse.json({
      success: true,
      message: 'Votes reset successfully for tie-breaking'
    });

  } catch (error) {
    console.error('API Error in POST /api/votes/reset:', error);
    return NextResponse.json(
      { error: 'Internal server error', success: false },
      { status: 500 }
    );
  }
}
