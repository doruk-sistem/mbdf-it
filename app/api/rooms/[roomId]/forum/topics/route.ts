import { NextRequest, NextResponse } from "next/server";
import { createMiddlewareSupabaseClient, createAdminSupabase } from "@/lib/supabase";

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

    // Use admin client to bypass RLS for viewing topics
    const adminSupabase = createAdminSupabase();

    // Allow all authenticated users to view forum topics
    // No membership check needed for viewing

    // Get unique topics with pin status for this room's forum messages using admin client
    const { data: topics, error } = await adminSupabase
      .from("message")
      .select("topic, is_pinned")
      .eq("room_id", params.roomId)
      .eq("message_type", "forum")
      .not("topic", "is", null);

    if (error) {
      console.error("Error fetching forum topics:", error);
      return NextResponse.json({ error: "Failed to fetch topics" }, { status: 500 });
    }

    // Group topics by name and check if any message in that topic is pinned
    const topicMap = new Map<string, boolean>();
    topics?.forEach((t: any) => {
      if (t.topic && t.topic.trim() !== "") {
        // If any message in this topic is pinned, mark the topic as pinned
        if (t.is_pinned) {
          topicMap.set(t.topic, true);
        } else if (!topicMap.has(t.topic)) {
          topicMap.set(t.topic, false);
        }
      }
    });

    // Convert to array and sort: pinned topics first, then alphabetically
    const allTopics = Array.from(topicMap.entries())
      .map(([topic, isPinned]) => ({ topic, isPinned }))
      .sort((a, b) => {
        // Pinned topics first
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        // Then alphabetically
        return a.topic.localeCompare(b.topic);
      });

    // Always ensure "Genel" is first if it exists
    const genelIndex = allTopics.findIndex(t => t.topic === "Genel");
    if (genelIndex > 0) {
      const genelTopic = allTopics.splice(genelIndex, 1)[0];
      allTopics.unshift(genelTopic);
    }

    return NextResponse.json({ topics: allTopics });
  } catch (error) {
    console.error("Forum topics API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
