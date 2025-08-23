import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase';
import { 
  RoomsListResponseSchema, 
  CreateRoomSchema,
  RoomWithDetailsSchema 
} from '@/lib/schemas';
import { z } from 'zod';

export async function GET(request: NextRequest) {
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

    // Get rooms with related data
    const { data: rooms, error } = await supabase
      .from('mbdf_room')
      .select(`
        *,
        substance (*),
        created_by_profile:profiles!mbdf_room_created_by_fkey (*),
        mbdf_member (count)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching rooms:', error);
      return NextResponse.json(
        { error: 'Failed to fetch rooms', success: false },
        { status: 500 }
      );
    }

    // Transform data to include member count
    const roomsWithCount = (rooms || []).map(room => ({
      ...room,
      member_count: Array.isArray(room.mbdf_member) ? room.mbdf_member.length : 0
    }));

    // Validate response
    const response = RoomsListResponseSchema.parse({
      items: roomsWithCount,
      total: roomsWithCount.length,
    });

    return NextResponse.json(response);
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

    // Create room
    const { data: room, error } = await supabase
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

    // Add creator as admin member
    const { error: memberError } = await supabase
      .from('mbdf_member')
      .insert([
        {
          room_id: room.id,
          user_id: user.id,
          role: 'admin',
        },
      ]);

    if (memberError) {
      console.error('Error adding creator as member:', memberError);
      // This is not critical, room is already created
    }

    // Add member count
    const roomWithDetails = {
      ...room,
      member_count: 1,
    };

    // Validate response
    const validatedRoom = RoomWithDetailsSchema.parse(roomWithDetails);

    return NextResponse.json(validatedRoom, { status: 201 });
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