import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase';

// DELETE /api/members/[memberId] - Remove member from room
export async function DELETE(
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
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId');

    if (!roomId) {
      return NextResponse.json({ 
        error: 'Missing required parameter: roomId' 
      }, { status: 400 });
    }

    // Check if current user has permission to remove members
    const { data: currentMember, error: currentMemberError } = await supabase
      .from("mbdf_member")
      .select("role")
      .eq("room_id", roomId)
      .eq("user_id", user.id)
      .single();

    if (currentMemberError || !currentMember) {
      return NextResponse.json({ 
        error: 'You are not a member of this room' 
      }, { status: 403 });
    }

    // Only admins and LR can remove members
    if (!['admin', 'lr'].includes(currentMember.role)) {
      return NextResponse.json({ 
        error: 'Insufficient permissions. Only admins and LR can remove members' 
      }, { status: 403 });
    }

    // Check if room is archived
    const { data: room, error: roomError } = await supabase
      .from("mbdf_room")
      .select("status")
      .eq("id", roomId)
      .single();

    if (roomError || !room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    if (room.status === 'archived') {
      return NextResponse.json({ 
        error: 'Room is archived. Membership changes are disabled' 
      }, { status: 400 });
    }

    // Get member to be removed
    const { data: targetMember, error: targetMemberError } = await supabase
      .from("mbdf_member")
      .select("user_id, role")
      .eq("id", memberId)
      .eq("room_id", roomId)
      .single();

    if (targetMemberError || !targetMember) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Don't allow removing the room creator if they're the only admin
    if (targetMember.role === "admin") {
      const { count } = await supabase
        .from("mbdf_member")
        .select("*", { count: "exact", head: true })
        .eq("room_id", roomId)
        .eq("role", "admin");

      if (count === 1) {
        return NextResponse.json({ 
          error: 'Cannot remove the only administrator' 
        }, { status: 400 });
      }
    }

    // Don't allow removing yourself
    if (targetMember.user_id === user.id) {
      return NextResponse.json({ 
        error: 'You cannot remove yourself from the room' 
      }, { status: 400 });
    }

    // Remove member
    const { error: deleteError } = await supabase
      .from("mbdf_member")
      .delete()
      .eq("id", memberId);

    if (deleteError) {
      console.error("Remove member error:", deleteError);
      return NextResponse.json({ 
        error: 'Failed to remove member' 
      }, { status: 500 });
    }

    // Log the action
    await supabase
      .from("audit_log")
      .insert({
        room_id: roomId,
        user_id: user.id,
        action: "member_removed",
        resource_type: "mbdf_member",
        resource_id: memberId,
        old_values: { 
          user_id: targetMember.user_id, 
          role: targetMember.role 
        }
      });

    return NextResponse.json({ 
      success: true, 
      message: 'Member removed successfully',
      memberId
    });

  } catch (error) {
    console.error("Remove member error:", error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
