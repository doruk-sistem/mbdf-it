import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase';

interface Params { params: { roomId: string } }

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { roomId } = params;
    const supabase = createServerSupabase();
    const admin = createAdminSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Ensure membership
    const { data: membership, error: memErr } = await admin
      .from('mbdf_member')
      .select('id')
      .eq('room_id', roomId)
      .eq('user_id', user.id)
      .single();
    if (memErr || !membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { data: room, error } = await admin
      .from('mbdf_room').select('*').eq('id', roomId).single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const [{ data: substance }, { count: memberCount }, { count: documentCount }, { count: packageCount }] = await Promise.all([
      admin.from('substance').select('*').eq('id', room.substance_id).single(),
      admin.from('mbdf_member').select('*', { count: 'exact', head: true }).eq('room_id', roomId),
      admin.from('document').select('*', { count: 'exact', head: true }).eq('room_id', roomId),
      admin.from('access_package').select('*', { count: 'exact', head: true }).eq('room_id', roomId),
    ]);
    return NextResponse.json({
      ...room,
      substance: substance || null,
      member_count: memberCount || 0,
      document_count: documentCount || 0,
      package_count: packageCount || 0,
    });
  } catch (error) {
    console.error('GET /api/member-rooms/[roomId] error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


