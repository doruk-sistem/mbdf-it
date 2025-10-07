import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase';

interface RouteParams {
  params: {
    token: string;
  };
}

// POST /api/invitations/[token]/accept - Accept invitation and join room
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const supabase = createServerSupabase();
    const adminSupabase = createAdminSupabase();
    const { token } = params;

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ 
        error: 'Lütfen giriş yapınız' 
      }, { status: 401 });
    }

    // Parse request body for tonnage
    const body = await request.json();
    const { tonnageRange } = body;

    // Validate tonnage range
    if (!tonnageRange) {
      return NextResponse.json({ 
        error: 'Tonaj bilgisi gereklidir' 
      }, { status: 400 });
    }

    // Validate tonnage format
    const validRanges = ['1-10', '10-100', '100-1000', '1000+'];
    if (!validRanges.includes(tonnageRange)) {
      return NextResponse.json({ 
        error: 'Geçersiz tonaj aralığı' 
      }, { status: 400 });
    }

    // Get invitation details
    const { data: invitation, error: invitationError } = await adminSupabase
      .from("room_invitations")
      .select(`
        id,
        room_id,
        email,
        status,
        message,
        expires_at,
        invited_by,
        mbdf_room (
          id,
          name,
          status
        )
      `)
      .eq("token", token)
      .single() as any;

    if (invitationError || !invitation) {
      return NextResponse.json({ 
        error: 'Davet bulunamadı' 
      }, { status: 404 });
    }

    // Verify that the logged-in user's email matches the invitation email
    if (user.email !== (invitation as any).email) {
      return NextResponse.json({ 
        error: 'Bu davet başka bir e-posta adresi için gönderilmiş. Lütfen doğru hesapla giriş yapınız.',
        invitedEmail: (invitation as any).email,
        currentEmail: user.email
      }, { status: 403 });
    }

    // Check if invitation is expired
    const now = new Date();
    const expiresAt = new Date((invitation as any).expires_at);
    
    if (now > expiresAt) {
      // Update status to expired
      await (adminSupabase
        .from("room_invitations") as any)
        .update({ status: 'expired' })
        .eq("id", (invitation as any).id);

      return NextResponse.json({ 
        error: 'Bu davet süresi dolmuş' 
      }, { status: 400 });
    }

    // Check if invitation is already accepted
    if ((invitation as any).status === 'accepted') {
      return NextResponse.json({ 
        error: 'Bu davet zaten kabul edilmiş',
        roomId: (invitation as any).room_id
      }, { status: 400 });
    }

    // Check if invitation is not pending
    if ((invitation as any).status !== 'pending') {
      return NextResponse.json({ 
        error: 'Bu davet artık geçerli değil' 
      }, { status: 400 });
    }

    // Check if room is archived
    if ((invitation as any).mbdf_room?.status === 'archived') {
      return NextResponse.json({ 
        error: 'Bu oda arşivlenmiş durumda' 
      }, { status: 400 });
    }

    // Check if user is already a member of the room
    const { data: existingMember } = await adminSupabase
      .from("mbdf_member")
      .select("id, role")
      .eq("room_id", (invitation as any).room_id)
      .eq("user_id", user.id)
      .single();

    if (existingMember) {
      // Update invitation status to accepted even though already a member
      await (adminSupabase
        .from("room_invitations") as any)
        .update({ 
          status: 'accepted',
          accepted_at: new Date().toISOString()
        })
        .eq("id", (invitation as any).id);

      return NextResponse.json({ 
        success: true,
        message: 'Bu odanın zaten bir üyesisiniz',
        roomId: (invitation as any).room_id,
        alreadyMember: true
      });
    }

    // Add user to the room as a member with tonnage
    const { error: memberError } = await adminSupabase
      .from("mbdf_member")
      .insert({
        room_id: (invitation as any).room_id,
        user_id: user.id,
        role: 'member',
        tonnage_range: tonnageRange
      } as any);

    if (memberError) {
      console.error('Error adding member:', memberError);
      return NextResponse.json({ 
        error: 'Odaya katılırken bir hata oluştu',
        details: memberError.message
      }, { status: 500 });
    }

    // Update invitation status to accepted
    const { error: updateError } = await (adminSupabase
      .from("room_invitations") as any)
      .update({ 
        status: 'accepted',
        accepted_at: new Date().toISOString()
      })
      .eq("id", (invitation as any).id);

    if (updateError) {
      console.error('Error updating invitation:', updateError);
      // Don't fail if we can't update the invitation status
      // The user is already added to the room
    }

    // Log the acceptance
    await supabase
      .from("audit_log")
      .insert({
        room_id: (invitation as any).room_id,
        user_id: user.id,
        action: "invitation_accepted",
        resource_type: "room_invitation",
        resource_id: (invitation as any).id,
        new_values: { 
          invitation_id: (invitation as any).id,
          room_id: (invitation as any).room_id,
          tonnage_range: tonnageRange,
          accepted_at: new Date().toISOString()
        }
      });

    return NextResponse.json({ 
      success: true,
      message: 'Odaya başarıyla katıldınız!',
      roomId: (invitation as any).room_id,
      roomName: (invitation as any).mbdf_room?.name
    });

  } catch (error) {
    console.error('Error accepting invitation:', error);
    return NextResponse.json({ 
      error: 'Sunucu hatası' 
    }, { status: 500 });
  }
}

