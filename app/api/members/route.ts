import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase';

// GET /api/members - Get room members
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabase();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId');

    if (!roomId) {
      return NextResponse.json(
        { error: 'roomId parameter is required' },
        { status: 400 }
      );
    }

    // Allow all authenticated users to view members
    // No membership check needed - all users can see room members
    const { data: membership } = await supabase
      .from("mbdf_member")
      .select("role")
      .eq("room_id", roomId)
      .eq("user_id", user.id)
      .single();

    // Use admin client to bypass RLS for reading members
    const adminSupabase = createAdminSupabase();
    
    // Get all members for this room
    const { data: members, error } = await adminSupabase
      .from('mbdf_member')
      .select(`
        id,
        user_id,
        role,
        joined_at,
        tonnage_range,
        profiles:user_id (
          id,
          full_name,
          email,
          company:company_id (
            id,
            name
          )
        )
      `)
      .eq('room_id', roomId)
      .order('joined_at', { ascending: true });

    if (error) {
      console.error('Error fetching members:', error);
      return NextResponse.json(
        { error: 'Failed to fetch members' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      items: members || [],
      total: members?.length || 0,
      currentUserRole: membership?.role || 'member' // Default to member if not found
    });

  } catch (error) {
    console.error('API Error in GET /api/members:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/members - Add member to room
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabase();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { roomId, room_id, userEmail, role } = body;

    // Handle both roomId and room_id field names for backward compatibility
    const actualRoomId = roomId || room_id;

    if (!actualRoomId || !role) {
      return NextResponse.json({ 
        error: 'Missing required fields: roomId, role' 
      }, { status: 400 });
    }

    // For self-join, userEmail is not required - use current user's email
    const actualUserEmail = userEmail || user.email;

    // Check if current user has permission to add members
    const { data: member, error: memberError } = await supabase
      .from("mbdf_member")
      .select("role")
      .eq("room_id", actualRoomId)
      .eq("user_id", user.id)
      .single();


    // Special case: If user is trying to join a room themselves (self-join)
    const isSelfJoin = user.email === actualUserEmail;
    
    if (isSelfJoin) {
      // Allow self-join if user is not already a member
      if (member) {
        return NextResponse.json({ 
          error: 'You are already a member of this room' 
        }, { status: 400 });
      }
    } else {
      // For adding other users, require admin or LR permissions
      if (memberError || !member || (member.role !== "admin" && member.role !== "lr")) {
        return NextResponse.json({ 
          error: 'Insufficient permissions to add members' 
        }, { status: 403 });
      }
    }

    // LR can only add members with "member" role (but not for self-join)
    if (!isSelfJoin && member && member.role === "lr" && role !== "member") {
      return NextResponse.json({ 
        error: 'LR can only add members with "member" role' 
      }, { status: 403 });
    }

    // Check if room is archived - use admin client to bypass RLS
    const adminSupabase = createAdminSupabase();
    const { data: room, error: roomError } = await adminSupabase
      .from("mbdf_room")
      .select("status, name, description")
      .eq("id", actualRoomId)
      .single();

    if (roomError || !room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    if ((room as any).status === 'archived') {
      return NextResponse.json({ 
        error: 'Room is archived. Membership changes are disabled' 
      }, { status: 400 });
    }

    // Use admin client to bypass RLS for profile lookup (already defined above)
    
    // Find user by email
    const { data: targetProfile, error: profileError } = await adminSupabase
      .from("profiles")
      .select("id, full_name")
      .eq("email", actualUserEmail)
      .single();

    if (profileError || !targetProfile) {
      return NextResponse.json({ 
        error: 'User not found with this email address' 
      }, { status: 404 });
    }

    // Type assertion to fix TypeScript error
    const profile = targetProfile as { id: string; full_name: string | null };

    // Check if user is already a member
    const { data: existingMember, error: existingError } = await supabase
      .from("mbdf_member")
      .select("id")
      .eq("room_id", actualRoomId)
      .eq("user_id", profile.id)
      .single();

    if (existingMember) {
      return NextResponse.json({ 
        error: 'User is already a member of this room' 
      }, { status: 400 });
    }

    // Add user as member
    const { error: insertError } = await supabase
      .from("mbdf_member")
      .insert({
        room_id: actualRoomId,
        user_id: profile.id,
        role: role,
        tonnage_range: body.tonnageRange || null
      });

    if (insertError) {
      return NextResponse.json({ 
        error: 'Failed to add member to room' 
      }, { status: 500 });
    }

    // Get inviter's profile info
    const { data: inviterProfile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();


    // Log the action
    await supabase
      .from("audit_log")
      .insert({
        room_id: actualRoomId,
        user_id: user.id,
        action: "member_added",
        resource_type: "mbdf_member",
        new_values: { 
          room_id: actualRoomId, 
          user_id: profile.id, 
          role, 
          added_by: user.id 
        }
      });

    return NextResponse.json({ 
      success: true, 
      message: 'Member added successfully',
      memberId: profile.id
    });

  } catch (error) {
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

// PUT /api/members - Update member tonnage
export async function PUT(request: NextRequest) {
  try {
    const supabase = createServerSupabase();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { memberId, tonnageRange } = body;

    if (!memberId) {
      return NextResponse.json({ 
        error: 'Missing required field: memberId' 
      }, { status: 400 });
    }

    // Use admin client to bypass RLS
    const adminSupabase = createAdminSupabase();
    
    // Get the member record to verify ownership
    const { data: member, error: memberError } = await (adminSupabase as any)
      .from("mbdf_member")
      .select("room_id, user_id")
      .eq("id", memberId)
      .single();

    if (memberError || !member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Allow only if user is updating their own tonnage
    if (member.user_id !== user.id) {
      return NextResponse.json({ 
        error: 'You can only update your own tonnage' 
      }, { status: 403 });
    }

    // Update member tonnage using admin client
    const { error: updateError } = await (adminSupabase as any)
      .from("mbdf_member")
      .update({ tonnage_range: tonnageRange || null })
      .eq("id", memberId);

    if (updateError) {
      return NextResponse.json({ 
        error: 'Failed to update tonnage' 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Tonnage updated successfully' 
    });

  } catch (error) {
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}