import { NextRequest, NextResponse } from "next/server";
import { createMiddlewareSupabaseClient, createAdminSupabase } from "@/lib/supabase";
import { z } from "zod";

const createMessageSchema = z.object({
  content: z.string().min(1, "Mesaj içeriği boş olamaz"),
  message_type: z.string().default("forum"),
  topic: z.string().min(1, "Konu seçimi gereklidir").default("Genel")
});

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

    // Get topic from query parameters
    const { searchParams } = new URL(request.url);
    const topic = searchParams.get('topic') || 'Genel';

    // Get forum messages for the room and topic
    const { data: messages, error } = await supabase
      .from("message")
      .select(`
        id,
        content,
        message_type,
        topic,
        created_at,
        updated_at,
        sender_id
      `)
      .eq("room_id", params.roomId)
      .eq("message_type", "forum")
      .eq("topic", topic)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching forum messages:", error);
      return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
    }

    // Get sender profiles separately to avoid stack depth issues
    const senderIds = messages?.map((m: any) => m.sender_id) || [];
    let profiles: any[] = [];
    
    if (senderIds.length > 0) {
      // Use admin client to bypass RLS for profiles
      const adminSupabase = createAdminSupabase();
      const { data: profilesData, error: profilesError } = await adminSupabase
        .from("profiles")
        .select(`
          id, 
          full_name, 
          avatar_url,
          company:company_id (
            name
          )
        `)
        .in("id", senderIds);
      
      if (profilesError) {
        console.error("Error fetching profiles:", profilesError);
      }
      
      profiles = profilesData || [];
    }

    // Combine messages with profiles
    const messagesWithProfiles = messages?.map((message: any) => ({
      ...message,
      profiles: profiles.find(p => p.id === message.sender_id) || { 
        id: message.sender_id, 
        full_name: "Unknown User", 
        avatar_url: null 
      }
    })) || [];

    return NextResponse.json({ messages: messagesWithProfiles });
  } catch (error) {
    console.error("Forum API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
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

    const body = await request.json();
    const { content, message_type, topic } = createMessageSchema.parse(body);

    // Create new forum message
    const { data: message, error } = await supabase
      .from("message")
      .insert({
        room_id: params.roomId,
        sender_id: user.id,
        content,
        message_type: message_type || "forum",
        topic: topic || "Genel"
      } as any)
      .select(`
        id,
        content,
        message_type,
        topic,
        created_at,
        updated_at,
        sender_id
      `)
      .single();

    if (error) {
      console.error("Error creating forum message:", error);
      return NextResponse.json({ error: "Failed to create message" }, { status: 500 });
    }

    // Get sender profile
    // Use admin client to bypass RLS for profiles
    const adminSupabase = createAdminSupabase();
    const { data: profile, error: profileError } = await adminSupabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .eq("id", user.id)
      .single();
    
    if (profileError) {
      console.error("Error fetching profile:", profileError);
    }

    const messageWithProfile = {
      ...(message as any),
      profiles: profile || { id: user.id, full_name: "Unknown User", avatar_url: null }
    };

    return NextResponse.json({ message: messageWithProfile }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input", details: error.issues }, { status: 400 });
    }
    console.error("Forum API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}