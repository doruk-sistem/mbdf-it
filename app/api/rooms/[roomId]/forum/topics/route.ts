import { NextRequest, NextResponse } from "next/server";
import { createMiddlewareSupabaseClient } from "@/lib/supabase";

export async function GET(
  request: NextRequest,
  { params }: { params: { roomId: string } }
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
      return NextResponse.json({ error: "Access denied", code: "ACCESS_DENIED" }, { status: 403 });
    }

    // Get unique topics for this room's forum messages
    const { data: topics, error } = await supabase
      .from("message")
      .select("topic")
      .eq("room_id", params.roomId)
      .eq("message_type", "forum")
      .not("topic", "is", null);

    if (error) {
      console.error("Error fetching forum topics:", error);
      return NextResponse.json({ error: "Failed to fetch topics" }, { status: 500 });
    }

    // Extract unique topics and sort them
    const uniqueTopics = Array.from(new Set(topics?.map(t => t.topic) || []))
      .filter(topic => topic && topic.trim() !== "")
      .sort();

    // Always include "Genel" as the first topic
    const allTopics = ["Genel", ...uniqueTopics.filter(topic => topic !== "Genel")];

    return NextResponse.json({ topics: allTopics });
  } catch (error) {
    console.error("Forum topics API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
