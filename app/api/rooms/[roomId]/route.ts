import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase';
import { RoomWithDetailsSchema } from '@/lib/schemas';
import { z } from 'zod';

interface RouteParams {
  params: {
    roomId: string;
  };
}

export async function GET(
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

    // Get room with related data
    const { data: room, error } = await supabase
      .from('mbdf_room')
      .select(`
        *,
        substance (*),
        created_by_profile:profiles!mbdf_room_created_by_fkey (*),
        mbdf_member (count)
      `)
      .eq('id', roomId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Room not found', success: false },
          { status: 404 }
        );
      }
      
      console.error('Error fetching room:', error);
      return NextResponse.json(
        { error: 'Failed to fetch room', success: false },
        { status: 500 }
      );
    }

    // Check if user has access to this room
    const { data: membership, error: memberError } = await supabase
      .from('mbdf_member')
      .select('id')
      .eq('room_id', roomId)
      .eq('user_id', user.id)
      .single();

    if (memberError && memberError.code !== 'PGRST116') {
      console.error('Error checking membership:', memberError);
      return NextResponse.json(
        { error: 'Failed to verify access', success: false },
        { status: 500 }
      );
    }

    if (!membership) {
      return NextResponse.json(
        { error: 'Access denied', success: false },
        { status: 403 }
      );
    }

    // Transform data to include member count
    const roomWithCount = {
      ...room,
      member_count: Array.isArray(room.mbdf_member) ? room.mbdf_member.length : 0,
    };

    // Validate response
    const validatedRoom = RoomWithDetailsSchema.parse(roomWithCount);

    return NextResponse.json(validatedRoom);
  } catch (error) {
    console.error('API Error in GET /api/rooms/[roomId]:', error);
    
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

export async function PUT(
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

    // Check if user is admin of this room
    const { data: membership, error: memberError } = await supabase
      .from('mbdf_member')
      .select('role')
      .eq('room_id', roomId)
      .eq('user_id', user.id)
      .single();

    if (memberError) {
      return NextResponse.json(
        { error: 'Access denied', success: false },
        { status: 403 }
      );
    }

    if (membership.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required', success: false },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const updateData: Partial<{
      name: string;
      description: string | null;
      status: 'active' | 'closed' | 'archived';
    }> = {};

    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.status !== undefined) updateData.status = body.status;

    // Update room
    const { data: room, error } = await supabase
      .from('mbdf_room')
      .update(updateData)
      .eq('id', roomId)
      .select(`
        *,
        substance (*),
        created_by_profile:profiles!mbdf_room_created_by_fkey (*),
        mbdf_member (count)
      `)
      .single();

    if (error) {
      console.error('Error updating room:', error);
      return NextResponse.json(
        { error: 'Failed to update room', success: false },
        { status: 500 }
      );
    }

    // Transform data to include member count
    const roomWithCount = {
      ...room,
      member_count: Array.isArray(room.mbdf_member) ? room.mbdf_member.length : 0,
    };

    // Validate response
    const validatedRoom = RoomWithDetailsSchema.parse(roomWithCount);

    return NextResponse.json(validatedRoom);
  } catch (error) {
    console.error('API Error in PUT /api/rooms/[roomId]:', error);
    
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

export async function DELETE(
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

    // Check if user is admin of this room
    const { data: membership, error: memberError } = await supabase
      .from('mbdf_member')
      .select('role')
      .eq('room_id', roomId)
      .eq('user_id', user.id)
      .single();

    if (memberError) {
      return NextResponse.json(
        { error: 'Access denied', success: false },
        { status: 403 }
      );
    }

    if (membership.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required', success: false },
        { status: 403 }
      );
    }

    // Archive room instead of deleting
    const { error } = await supabase
      .from('mbdf_room')
      .update({ status: 'archived' })
      .eq('id', roomId);

    if (error) {
      console.error('Error archiving room:', error);
      return NextResponse.json(
        { error: 'Failed to archive room', success: false },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Room archived successfully' 
    });
  } catch (error) {
    console.error('API Error in DELETE /api/rooms/[roomId]:', error);
    
    return NextResponse.json(
      { error: 'Internal server error', success: false },
      { status: 500 }
    );
  }
}