import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase';

// PUT /api/members/[memberId]/role - Update member role
export async function PUT(
  request: NextRequest,
  { params }: { params: { memberId: string } }
) {
  try {
    const supabase = createServerSupabase();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { memberId } = params;
    const body = await request.json();
    const { role } = body;

    if (!role) {
      return NextResponse.json({ 
        error: 'Missing required field: role' 
      }, { status: 400 });
    }

    // Validate role
    if (!['admin', 'lr', 'member'].includes(role)) {
      return NextResponse.json({ 
        error: 'Invalid role. Must be admin, lr, or member' 
      }, { status: 400 });
    }

    // Get member to update
    const { data: member, error: memberError } = await supabase
      .from("mbdf_member")
      .select("room_id, user_id, role")
      .eq("id", memberId)
      .single();

    if (memberError || !member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Check if current user has permission to update this member's role
    const { data: currentMember, error: currentMemberError } = await supabase
      .from("mbdf_member")
      .select("role")
      .eq("room_id", member.room_id)
      .eq("user_id", user.id)
      .single();

    if (currentMemberError || !currentMember) {
      return NextResponse.json({ 
        error: 'You are not a member of this room' 
      }, { status: 403 });
    }

    // Only admins can update roles
    if (currentMember.role !== "admin") {
      return NextResponse.json({ 
        error: 'Insufficient permissions. Only admins can update member roles' 
      }, { status: 403 });
    }

    // Check if room is archived
    const { data: room, error: roomError } = await supabase
      .from("mbdf_room")
      .select("status")
      .eq("id", member.room_id)
      .single();

    if (roomError || !room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    if (room.status === 'archived') {
      return NextResponse.json({ 
        error: 'Room is archived. Role changes are disabled' 
      }, { status: 400 });
    }

    // Don't allow changing the role of the only admin
    if (member.role === "admin" && role !== "admin") {
      const { count } = await supabase
        .from("mbdf_member")
        .select("*", { count: "exact", head: true })
        .eq("room_id", member.room_id)
        .eq("role", "admin");

      if (count === 1) {
        return NextResponse.json({ 
          error: 'Cannot change the role of the only administrator' 
        }, { status: 400 });
      }
    }

    // Update member role
    const { error: updateError } = await supabase
      .from("mbdf_member")
      .update({ role })
      .eq("id", memberId);

    if (updateError) {
      console.error("Update member role error:", updateError);
      return NextResponse.json({ 
        error: 'Failed to update member role' 
      }, { status: 500 });
    }

    // Log the action
    await supabase
      .from("audit_log")
      .insert({
        room_id: member.room_id,
        user_id: user.id,
        action: "role_updated",
        resource_type: "mbdf_member",
        resource_id: memberId,
        old_values: { role: member.role },
        new_values: { role }
      });

    return NextResponse.json({ 
      success: true, 
      message: 'Member role updated successfully',
      memberId,
      newRole: role
    });

  } catch (error) {
    console.error("Update member role error:", error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
