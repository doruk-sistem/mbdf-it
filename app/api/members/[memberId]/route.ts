import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase';

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

    // Permission check will be done later based on whether user is removing themselves or others

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

    // Check permissions based on who is being removed
    const isRemovingSelf = targetMember.user_id === user.id;
    
    if (isRemovingSelf) {
      // User is trying to leave the room themselves
      // Only normal members can leave themselves (admin/LR cannot leave themselves)
      if (currentMember.role !== "member") {
        return NextResponse.json({ 
          error: 'Admins and LR cannot leave the room themselves. Transfer your role first.' 
        }, { status: 403 });
      }
    } else {
      // User is removing someone else - need admin/LR permissions
      if (!['admin', 'lr'].includes(currentMember.role)) {
        return NextResponse.json({ 
          error: 'Insufficient permissions. Only admins and LR can remove other members' 
        }, { status: 403 });
      }
      
      // LR cannot remove other LR or admins
      if (currentMember.role === "lr" && (targetMember.role === "lr" || targetMember.role === "admin")) {
        return NextResponse.json({ 
          error: 'LR can only remove regular members' 
        }, { status: 403 });
      }
    }

    // Remove member using admin client to bypass RLS
    const adminSupabase = createAdminSupabase();
    const { error: deleteError } = await adminSupabase
      .from("mbdf_member")
      .delete()
      .eq("id", memberId);

    if (deleteError) {
      console.error("Remove member error:", deleteError);
      return NextResponse.json({ 
        error: 'Failed to remove member' 
      }, { status: 500 });
    }
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
