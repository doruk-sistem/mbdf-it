import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase';

interface RouteParams {
  params: {
    token: string;
  };
}

// GET /api/invitations/[token]/check-membership - Check if user is already a member
export async function GET(
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
        isMember: false,
        requiresAuth: true
      });
    }

    // Get invitation details
    const { data: invitation, error: invitationError } = await adminSupabase
      .from("room_invitations")
      .select("room_id, email")
      .eq("token", token)
      .single() as any;

    if (invitationError || !invitation) {
      return NextResponse.json({ 
        error: 'Davet bulunamadı' 
      }, { status: 404 });
    }

    // Check if user is already a member of the room
    const { data: existingMember } = await adminSupabase
      .from("mbdf_member")
      .select("id, role")
      .eq("room_id", (invitation as any).room_id)
      .eq("user_id", user.id)
      .single();

    return NextResponse.json({ 
      isMember: !!existingMember,
      requiresAuth: false,
      emailMatch: user.email === (invitation as any).email,
      currentEmail: user.email,
      invitedEmail: (invitation as any).email
    });

  } catch (error) {
    console.error('Error checking membership:', error);
    return NextResponse.json({ 
      error: 'Sunucu hatası' 
    }, { status: 500 });
  }
}

