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

    // Get unique topics for this room's forum messages using admin client
    const { data: topics, error } = await adminSupabase
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
    const uniqueTopics = Array.from(new Set(topics?.map((t: any) => t.topic) || []))
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
