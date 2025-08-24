import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase';
import { z } from 'zod';
import { sendEmail } from '@/lib/email';

interface RouteParams {
  params: {
    roomId: string;
  };
}

const ArchiveRequestSchema = z.object({
  reason: z.string().min(10, 'Archive reason must be at least 10 characters').optional(),
});

const ArchiveResponseSchema = z.object({
  success: z.boolean(),
  room_id: z.string().uuid(),
  room_name: z.string(),
  archived_at: z.string(),
  archive_reason: z.string().nullable(),
  pending_requests_rejected: z.number(),
  approved_requests_revoked: z.number(),
});

export async function POST(
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

    // Parse request body
    const body = await request.json();
    const { reason } = ArchiveRequestSchema.parse(body);

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

    // Get room members for email notifications
    const { data: roomMembers, error: membersError } = await adminSupabase
      .from('mbdf_member')
      .select(`
        user_id,
        profiles:user_id(
          email,
          full_name,
          company:company_id(name)
        )
      `)
      .eq('room_id', roomId) as { data: any; error: any };

    if (membersError) {
      console.error('Error fetching room members:', membersError);
      return NextResponse.json(
        { error: 'Failed to fetch room members', success: false },
        { status: 500 }
      );
    }

    // Call the archive_room database function with user context
    const { data: archiveResult, error: archiveError } = await (supabase as any)
      .rpc('archive_room', {
        p_room_id: roomId,
        p_reason: reason || null
      });

    if (archiveError) {
      console.error('Error archiving room:', archiveError);
      return NextResponse.json(
        { error: archiveError.message || 'Failed to archive room', success: false },
        { status: 500 }
      );
    }

    // Send email notifications to all room members
    if (roomMembers && roomMembers.length > 0) {
      const emailPromises = roomMembers
        .filter((member: any) => member.profiles?.email)
        .map(async (member: any) => {
          try {
            await sendEmail({
              to: member.profiles.email,
              subject: `MBDF Room Archived: ${archiveResult.room_name}`,
              template: 'roomArchived',
              data: {
                memberName: member.profiles.full_name || 'Member',
                roomName: archiveResult.room_name,
                archiveReason: reason || 'No reason provided',
                archivedAt: new Date(archiveResult.archived_at).toLocaleDateString(),
                pendingRejected: archiveResult.pending_requests_rejected,
                approvedRevoked: archiveResult.approved_requests_revoked,
              }
            });
          } catch (emailError) {
            console.error(`Failed to send archive notification to ${member.profiles.email}:`, emailError);
          }
        });

      // Don't wait for emails to complete, but handle them asynchronously
      Promise.allSettled(emailPromises);
    }

    // Validate and return response
    const validatedResponse = ArchiveResponseSchema.parse(archiveResult);

    return NextResponse.json(validatedResponse);
  } catch (error) {
    console.error('API Error in POST /api/rooms/[roomId]/archive/confirm:', error);
    
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