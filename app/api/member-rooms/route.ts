import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabase();
    const admin = createAdminSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Fetch rooms where user is a member
    const { data: memberships, error: memErr } = await admin
      .from('mbdf_member')
      .select('room_id')
      .eq('user_id', user.id);
    if (memErr) return NextResponse.json({ error: memErr.message }, { status: 500 });
    const roomIds = (memberships || []).map((m: any) => m.room_id);

    if (roomIds.length === 0) {
      return NextResponse.json({ items: [], total: 0 });
    }

    const { data: rooms, error } = await admin
      .from('mbdf_room')
      .select('*')
      .in('id', roomIds)
      .order('created_at', { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const roomsWithDetails = await Promise.all((rooms || []).map(async (room: any) => {
      const [{ data: substance }, { count: memberCount }] = await Promise.all([
        admin.from('substance').select('id,name,ec_number,cas_number').eq('id', room.substance_id).single(),
        admin.from('mbdf_member').select('*', { count: 'exact', head: true }).eq('room_id', room.id),
      ]);
      return { ...room, substance, member_count: memberCount || 0 };
    }));

    return NextResponse.json({ items: roomsWithDetails, total: roomsWithDetails.length });
  } catch (error) {
    console.error('GET /api/member-rooms error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


