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

    // Use admin client to bypass RLS for viewing messages
    const adminSupabase = createAdminSupabase();

    // Allow all authenticated users to view forum messages
    // No membership check needed for viewing

    // Get topic from query parameters
    const { searchParams } = new URL(request.url);
    const topic = searchParams.get('topic') || 'Genel';

    // Get forum messages for the room and topic using admin client
    const { data: messages, error } = await adminSupabase
      .from("message")
      .select(`
        id,
        content,
        message_type,
        topic,
        created_at,
        updated_at,
        sender_id,
        profiles!message_sender_id_fkey (
          id,
          full_name,
          avatar_url,
          tonnage,
          company:company_id (
            name
          )
        )
      `)
      .eq("room_id", params.roomId)
      .eq("message_type", "forum")
      .eq("topic", topic)
      .order("created_at", { ascending: false });

    // Also check ALL messages in this room (for debugging)
    const { data: allMessages, error: allError } = await adminSupabase
      .from("message")
      .select(`
        id,
        content,
        message_type,
        topic,
        created_at,
        sender_id
      `)
      .eq("room_id", params.roomId)
      .eq("message_type", "forum");
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
          tonnage,
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
        avatar_url: null,
        tonnage: null,
        company: null
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

      // Allow all authenticated users to post messages
    // No membership check needed - all users can participate in forum

    const body = await request.json();
    const { content, message_type, topic } = createMessageSchema.parse(body);

    // Use admin client to bypass RLS for message creation
    const adminSupabase = createAdminSupabase();
    
    // Create new forum message
    const { data: message, error } = await adminSupabase
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

    // Get sender profile using the same admin client
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