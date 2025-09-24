import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase';
import { sendEmail } from '@/lib/email';

interface RouteParams {
  params: {
    roomId: string;
  };
}

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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { email, message, roomName, inviterName } = body;

    if (!email || !roomName) {
      return NextResponse.json({ 
        error: 'Missing required fields: email, roomName' 
      }, { status: 400 });
    }

    // Check if current user is a member of the room
    const { data: member, error: memberError } = await supabase
      .from("mbdf_member")
      .select("role")
      .eq("room_id", roomId)
      .eq("user_id", user.id)
      .single();


    if (memberError || !member) {
      return NextResponse.json({ 
        error: 'You must be a member of this room to invite others',
        debug: {
          userId: user.id,
          roomId: roomId,
          memberError: memberError?.message
        }
      }, { status: 403 });
    }


    // Check if room exists and is not archived
    const adminSupabase = createAdminSupabase();
    const { data: room, error: roomError } = await adminSupabase
      .from("mbdf_room")
      .select("id, name, status")
      .eq("id", roomId)
      .single();

    if (roomError || !room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    if ((room as any).status === 'archived') {
      return NextResponse.json({ 
        error: 'Room is archived. Invitations are disabled' 
      }, { status: 400 });
    }

    // Check if user already exists in the system
    const { data: existingUser, error: userError } = await adminSupabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("email", email)
      .single();

    let recipientName = 'Kullanıcı';
    if (existingUser && !userError) {
      const user = existingUser as { id: string; full_name: string | null; email: string };
      recipientName = user.full_name || user.email || 'Kullanıcı';
    }

    // Get inviter's name
    const { data: inviterProfile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    const actualInviterName = inviterProfile?.full_name || inviterName || 'MBDF Üyesi';

    // Send invitation email
    try {
      const emailResult = await sendEmail({
        to: email,
        template: 'roomInvitation',
        data: {
          recipientName,
          roomName: roomName,
          inviterName: actualInviterName,
          message: message || '',
          roomId: roomId
        }
      });

      // Log the invitation
      await supabase
        .from("audit_log")
        .insert({
          room_id: roomId,
          user_id: user.id,
          action: "room_invitation_sent",
          resource_type: "mbdf_room",
          resource_id: roomId,
          new_values: { 
            invited_email: email,
            invitation_message: message || '',
            inviter_name: actualInviterName,
            email_result: emailResult
          }
        });

      return NextResponse.json({ 
        success: true, 
        message: emailResult.message || 'Invitation sent successfully',
        recipientEmail: email,
        emailResult: emailResult
      });

    } catch (emailError) {
      
      // Log the failed invitation attempt
      await supabase
        .from("audit_log")
        .insert({
          room_id: roomId,
          user_id: user.id,
          action: "room_invitation_failed",
          resource_type: "mbdf_room",
          resource_id: roomId,
          new_values: { 
            invited_email: email,
            invitation_message: message || '',
            inviter_name: actualInviterName,
            error: (emailError as Error).message
          }
        });

      return NextResponse.json({ 
        success: false,
        error: 'Failed to send invitation email',
        details: (emailError as Error).message,
        recipientEmail: email
      }, { status: 500 });
    }

  } catch (error) {
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
