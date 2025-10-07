import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase';
import { sendEmail } from '@/lib/email';
import crypto from 'crypto';

interface RouteParams {
  params: {
    roomId: string;
  };
}

// Generate a secure random token
function generateInvitationToken(): string {
  return crypto.randomBytes(32).toString('hex');
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
    let isRegistered = false;
    if (existingUser && !userError) {
      const user = existingUser as { id: string; full_name: string | null; email: string };
      recipientName = user.full_name || user.email || 'Kullanıcı';
      isRegistered = true;
    } else {
      // User not registered, use email as name
      recipientName = email;
    }

    // Get inviter's name
    const { data: inviterProfile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    const actualInviterName = inviterProfile?.full_name || inviterName || 'MBDF Üyesi';

    // Check if user is already a member of the room
    if (existingUser) {
      const { data: existingMember } = await adminSupabase
        .from("mbdf_member")
        .select("id")
        .eq("room_id", roomId)
        .eq("user_id", (existingUser as any).id)
        .single();

      if (existingMember) {
        return NextResponse.json({ 
          success: false,
          error: 'Bu kullanıcı zaten odanın bir üyesidir' 
        }, { status: 400 });
      }
    }

    // Check if there's already a pending invitation for this email and room
    const { data: existingInvitation } = await adminSupabase
      .from("room_invitations")
      .select("id, status, expires_at")
      .eq("room_id", roomId)
      .eq("email", email)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString())
      .single();

    if (existingInvitation) {
      return NextResponse.json({ 
        success: false,
        error: 'Bu e-posta adresi için aktif bir davet zaten mevcut' 
      }, { status: 400 });
    }

    // Generate invitation token
    const invitationToken = generateInvitationToken();
    
    // Set expiration date (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Create invitation record in database
    const { data: invitation, error: invitationError } = await adminSupabase
      .from("room_invitations")
      .insert({
        room_id: roomId,
        email: email,
        token: invitationToken,
        invited_by: user.id,
        status: 'pending',
        message: message || null,
        expires_at: expiresAt.toISOString()
      } as any)
      .select()
      .single() as any;

    if (invitationError || !invitation) {
      console.error('Error creating invitation:', invitationError);
      return NextResponse.json({ 
        success: false,
        error: 'Davet oluşturulamadı',
        details: invitationError?.message
      }, { status: 500 });
    }

    // Send invitation email with token
    try {
      const emailResult = await sendEmail({
        to: email,
        template: 'roomInvitation',
        data: {
          recipientName,
          roomName: roomName,
          inviterName: actualInviterName,
          message: message || '',
          invitationToken: invitationToken,
          isRegistered: isRegistered
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
            invitation_id: (invitation as any).id,
            invitation_message: message || '',
            inviter_name: actualInviterName,
            expires_at: expiresAt.toISOString(),
            email_result: emailResult
          }
        });

      return NextResponse.json({ 
        success: true, 
        message: emailResult.message || 'Davet başarıyla gönderildi',
        recipientEmail: email,
        invitationId: (invitation as any).id,
        expiresAt: expiresAt.toISOString(),
        emailResult: emailResult
      });

    } catch (emailError) {
      // Delete the invitation if email fails
      await adminSupabase
        .from("room_invitations")
        .delete()
        .eq("id", (invitation as any).id);

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
        error: 'Davet e-postası gönderilemedi',
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
