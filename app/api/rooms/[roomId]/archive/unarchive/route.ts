import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase';
import { z } from 'zod';
import { sendEmail } from '@/lib/email';

interface RouteParams {
  params: {
    roomId: string;
  };
}

const UnarchiveResponseSchema = z.object({
  success: z.boolean(),
  room_id: z.string().uuid(),
  room_name: z.string(),
  unarchived_at: z.string(),
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

    const adminSupabase = createAdminSupabase();

    // Room admin check will be done in the database function

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

    // Call the unarchive_room database function with user context
    const { data: unarchiveResult, error: unarchiveError } = await (supabase as any)
      .rpc('unarchive_room', {
        p_room_id: roomId
      });

    if (unarchiveError) {
      console.error('Error unarchiving room:', unarchiveError);
      return NextResponse.json(
        { error: unarchiveError.message || 'Failed to unarchive room', success: false },
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
              subject: `MBDF Room Reactivated: ${unarchiveResult.room_name}`,
              template: 'roomUnarchived',
              data: {
                memberName: member.profiles.full_name || 'Member',
                roomName: unarchiveResult.room_name,
                unarchivedAt: new Date(unarchiveResult.unarchived_at).toLocaleDateString(),
              }
            });
          } catch (emailError) {
            console.error(`Failed to send unarchive notification to ${member.profiles.email}:`, emailError);
          }
        });

      // Don't wait for emails to complete, but handle them asynchronously
      Promise.allSettled(emailPromises);
    }

    // Validate and return response
    const validatedResponse = UnarchiveResponseSchema.parse(unarchiveResult);

    return NextResponse.json(validatedResponse);
  } catch (error) {
    console.error('API Error in POST /api/rooms/[roomId]/archive/unarchive:', error);
    
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