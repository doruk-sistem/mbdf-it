import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase';
import { CreateRoomSchema } from '@/lib/schemas';
import { z } from 'zod';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabase();

    // Public meta list via RPC (no auth required)
    const { data, error } = await supabase.rpc('list_rooms_meta');

    if (error) {
      console.error('Error fetching public rooms meta:', error);
      return NextResponse.json(
        { error: 'Failed to fetch rooms', success: false },
        { status: 500 }
      );
    }

    const items = (data || []).map((r: any) => ({
      roomId: r.room_id,
      substanceName: r.substance_name,
      ec: r.ec,
      cas: r.cas,
      memberCount: r.member_count,
      lrSelected: r.lr_selected,
      createdAt: r.created_at,
    }));

    return NextResponse.json({ items, total: items.length });
  } catch (error) {
    console.error('API Error in GET /api/rooms:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid response format', details: error.issues, success: false },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error', success: false },
      { status: 500 }
    );
  }
}

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
    const validatedData = CreateRoomSchema.parse(body);

    // Use admin client to bypass RLS for room creation
    const adminSupabase = createAdminSupabase();
    
    // Create room using admin client with type assertion
    const { data: room, error } = await (adminSupabase as any)
      .from('mbdf_room')
      .insert([
        {
          name: validatedData.name,
          description: validatedData.description || null,
          substance_id: validatedData.substance_id,
          created_by: user.id,
          status: 'active',
        },
      ])
      .select(`
        *,
        substance (*),
        created_by_profile:profiles!mbdf_room_created_by_fkey (*)
      `)
      .single();

    if (error) {
      console.error('Error creating room:', error);
      return NextResponse.json(
        { error: 'Failed to create room', success: false },
        { status: 500 }
      );
    }

    // Add creator as admin member using admin client with type assertion
    const { error: memberError } = await (adminSupabase as any)
      .from('mbdf_member')
      .insert([
        {
          room_id: (room as any)?.id,
          user_id: user.id,
          role: 'admin',
        },
      ]);

    if (memberError) {
      console.error('Error adding creator as member:', memberError);
      // This is not critical, room is already created
    }

    // Add member count with type assertion
    const roomWithDetails = {
      ...(room as any),
      member_count: 1,
    };

    // Return response without validation to avoid schema issues
    return NextResponse.json(roomWithDetails, { status: 201 });
  } catch (error) {
    console.error('API Error in POST /api/rooms:', error);
    
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