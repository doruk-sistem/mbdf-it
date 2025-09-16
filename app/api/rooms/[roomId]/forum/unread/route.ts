import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, createAdminSupabase } from "@/lib/supabase";

export async function GET(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const supabase = createServerSupabase();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use admin client to bypass RLS for reading data
    const adminSupabase = createAdminSupabase();

    // Get user's last forum visit time
    const { data: profile, error: profileError } = await adminSupabase
      .from("profiles")
      .select("last_forum_visit")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 });
    }

    const lastForumVisit = (profile as any).last_forum_visit 
      ? new Date((profile as any).last_forum_visit) 
      : new Date('1970-01-01');

    // Get all topics in this room
    const { data: topics, error: topicsError } = await adminSupabase
      .from("message")
      .select("topic")
      .eq("room_id", params.roomId)
      .eq("message_type", "forum")
      .not("topic", "is", null);

    if (topicsError) {
      console.error("Error fetching topics:", topicsError);
      return NextResponse.json({ error: "Failed to fetch topics" }, { status: 500 });
    }

    // Get unique topics
    const uniqueTopics = Array.from(new Set(topics?.map((t: any) => t.topic) || []))
      .filter(topic => topic && topic.trim() !== "");

    // Calculate unread count for each topic
    const unreadCounts: Record<string, number> = {};
    
    for (const topic of uniqueTopics) {
      const { data: unreadMessages, error: unreadError } = await adminSupabase
        .from("message")
        .select("id", { count: 'exact' })
        .eq("room_id", params.roomId)
        .eq("message_type", "forum")
        .eq("topic", topic)
        .eq("is_deleted", false)
        .neq("sender_id", user.id) // Don't count own messages
        .gt("created_at", lastForumVisit.toISOString());

      if (!unreadError && unreadMessages) {
        unreadCounts[topic] = unreadMessages.length || 0;
      } else {
        unreadCounts[topic] = 0;
      }
    }

    // Calculate total unread count
    const totalUnread = Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);

    return NextResponse.json({
      unreadCounts,
      totalUnread,
      lastForumVisit: lastForumVisit.toISOString()
    });

  } catch (error) {
    console.error("Forum unread API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const supabase = createServerSupabase();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Update user's last forum visit time
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ 
        last_forum_visit: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("Error updating forum visit time:", updateError);
      return NextResponse.json({ error: "Failed to update visit time" }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Forum visit update API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
