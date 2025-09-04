import { NextRequest, NextResponse } from "next/server";
import { createMiddlewareSupabaseClient, createAdminSupabase } from "@/lib/supabase";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { roomId: string; messageId: string } }
) {
  try {
    const response = NextResponse.next();
    const supabase = createMiddlewareSupabaseClient(request, response);

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is member of the room
    const { data: membership } = await supabase
      .from("mbdf_member")
      .select("id")
      .eq("room_id", params.roomId)
      .eq("user_id", user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Get the message to check ownership
    const { data: message, error: messageError } = await supabase
      .from("message")
      .select("sender_id, room_id")
      .eq("id", params.messageId)
      .eq("room_id", params.roomId)
      .eq("message_type", "forum")
      .single();

    if (messageError || !message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    // Check if user owns the message
    if (message.sender_id !== user.id) {
      return NextResponse.json({ error: "You can only delete your own messages" }, { status: 403 });
    }

    // Delete the message using admin client to bypass RLS
    const adminSupabase = createAdminSupabase();
    const { error: deleteError, count } = await adminSupabase
      .from("message")
      .delete()
      .eq("id", params.messageId)
      .eq("sender_id", user.id);

    if (deleteError) {
      console.error("Error deleting message:", deleteError);
      return NextResponse.json({ error: "Failed to delete message" }, { status: 500 });
    }

    if (count === 0) {
      return NextResponse.json({ error: "Message not found or not owned by user" }, { status: 404 });
    }

    return NextResponse.json({ success: true, deletedCount: count });
  } catch (error) {
    console.error("Delete Message API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
