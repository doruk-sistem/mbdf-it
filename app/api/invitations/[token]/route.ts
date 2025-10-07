import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase';

interface RouteParams {
  params: {
    token: string;
  };
}

// GET /api/invitations/[token] - Get invitation details
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { token } = params;
    const adminSupabase = createAdminSupabase();

    // Get invitation details
    const { data: invitation, error } = await adminSupabase
      .from("room_invitations")
      .select(`
        id,
        room_id,
        email,
        status,
        message,
        expires_at,
        created_at,
        invited_by,
        mbdf_room (
          id,
          name,
          status
        ),
        profiles!room_invitations_invited_by_fkey (
          full_name,
          email
        )
      `)
      .eq("token", token)
      .single() as any;

    if (error || !invitation) {
      return NextResponse.json({ 
        error: 'Davet bulunamadı',
        valid: false
      }, { status: 404 });
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
        error: 'Bu davet süresi dolmuş',
        valid: false,
        invitation: {
          ...(invitation as any),
          status: 'expired'
        }
      }, { status: 400 });
    }

    // Check if invitation is already accepted/rejected
    if ((invitation as any).status !== 'pending') {
      return NextResponse.json({ 
        error: (invitation as any).status === 'accepted' 
          ? 'Bu davet zaten kabul edilmiş' 
          : 'Bu davet artık geçerli değil',
        valid: false,
        invitation
      }, { status: 400 });
    }

    // Check if room is archived
    if ((invitation as any).mbdf_room?.status === 'archived') {
      return NextResponse.json({ 
        error: 'Bu oda arşivlenmiş durumda',
        valid: false,
        invitation
      }, { status: 400 });
    }

    return NextResponse.json({ 
      valid: true,
      invitation: {
        id: (invitation as any).id,
        roomId: (invitation as any).room_id,
        roomName: (invitation as any).mbdf_room?.name,
        email: (invitation as any).email,
        message: (invitation as any).message,
        inviterName: (invitation as any).profiles?.full_name || (invitation as any).profiles?.email,
        expiresAt: (invitation as any).expires_at,
        createdAt: (invitation as any).created_at
      }
    });

  } catch (error) {
    console.error('Error getting invitation:', error);
    return NextResponse.json({ 
      error: 'Sunucu hatası',
      valid: false
    }, { status: 500 });
  }
}

