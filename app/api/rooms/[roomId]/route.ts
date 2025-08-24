import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase';
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

    // Use admin client to bypass RLS
    const adminSupabase = createAdminSupabase();

    // First check if user has access to this room using admin client
    const { data: membership, error: memberError } = await adminSupabase
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

    // Get room basic data using admin client
    const { data: room, error: roomError } = await adminSupabase
      .from('mbdf_room')
      .select('*')
      .eq('id', roomId)
      .single() as { data: any; error: any };

    if (roomError) {
      if (roomError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Room not found', success: false },
          { status: 404 }
        );
      }
      
      console.error('Error fetching room:', roomError);
      return NextResponse.json(
        { error: 'Failed to fetch room', success: false },
        { status: 500 }
      );
    }

    // Get related data separately to avoid stack depth issues
    const [substanceResult, profileResult, memberCountResult, documentCountResult, packageCountResult] = await Promise.all([
      adminSupabase
        .from('substance')
        .select('*')
        .eq('id', room.substance_id)
        .single(),
      adminSupabase
        .from('profiles')
        .select('*')
        .eq('id', room.created_by)
        .single(),
      adminSupabase
        .from('mbdf_member')
        .select('*', { count: 'exact', head: true })
        .eq('room_id', roomId),
      adminSupabase
        .from('document')
        .select('*', { count: 'exact', head: true })
        .eq('room_id', roomId),
      adminSupabase
        .from('access_package')
        .select('*', { count: 'exact', head: true })
        .eq('room_id', roomId)
    ]);

    // Transform data to include all related data
    const roomWithCount = {
      ...room,
      substance: substanceResult.data || null,
      created_by_profile: profileResult.data || null,
      member_count: memberCountResult.count || 0,
      document_count: documentCountResult.count || 0,
      package_count: packageCountResult.count || 0,
      // Ensure archive fields exist with null values if not present (for backwards compatibility)
      archived_at: room.archived_at || null,
      archive_reason: room.archive_reason || null,
      archive_initiated_by: room.archive_initiated_by || null,
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

    // Use admin client to bypass RLS
    const adminSupabase = createAdminSupabase();

    // Check if user is admin of this room
    const { data: membership, error: memberError } = await adminSupabase
      .from('mbdf_member')
      .select('role')
      .eq('room_id', roomId)
      .eq('user_id', user.id)
      .single() as { data: any; error: any };

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

    // Update room using admin client
    const { data: room, error } = await (adminSupabase as any)
      .from('mbdf_room')
      .update(updateData)
      .eq('id', roomId)
      .select('*')
      .single();

    if (error) {
      console.error('Error updating room:', error);
      return NextResponse.json(
        { error: 'Failed to update room', success: false },
        { status: 500 }
      );
    }

    // Get related data separately to avoid stack depth issues
    const [substanceResult, profileResult, memberCountResult, documentCountResult, packageCountResult] = await Promise.all([
      adminSupabase
        .from('substance')
        .select('*')
        .eq('id', room.substance_id)
        .single(),
      adminSupabase
        .from('profiles')
        .select('*')
        .eq('id', room.created_by)
        .single(),
      adminSupabase
        .from('mbdf_member')
        .select('*', { count: 'exact', head: true })
        .eq('room_id', roomId),
      adminSupabase
        .from('document')
        .select('*', { count: 'exact', head: true })
        .eq('room_id', roomId),
      adminSupabase
        .from('access_package')
        .select('*', { count: 'exact', head: true })
        .eq('room_id', roomId)
    ]);

    // Transform data to include all related data
    const roomWithCount = {
      ...room,
      substance: substanceResult.data || null,
      created_by_profile: profileResult.data || null,
      member_count: memberCountResult.count || 0,
      document_count: documentCountResult.count || 0,
      package_count: packageCountResult.count || 0,
      // Ensure archive fields exist with null values if not present (for backwards compatibility)
      archived_at: room.archived_at || null,
      archive_reason: room.archive_reason || null,
      archive_initiated_by: room.archive_initiated_by || null,
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

    // Use admin client to bypass RLS
    const adminSupabase = createAdminSupabase();

    // Check if user is admin of this room
    const { data: membership, error: memberError } = await adminSupabase
      .from('mbdf_member')
      .select('role')
      .eq('room_id', roomId)
      .eq('user_id', user.id)
      .single() as { data: any; error: any };

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
    const { error } = await (adminSupabase as any)
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