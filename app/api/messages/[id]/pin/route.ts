import { NextRequest, NextResponse } from "next/server";
import { createMiddlewareSupabaseClient, createAdminSupabase } from "@/lib/supabase";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const response = NextResponse.next();
    const supabase = createMiddlewareSupabaseClient(request, response);
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { is_pinned } = body;

    // Use admin client to bypass RLS for message pinning
    const adminSupabase = createAdminSupabase();
    
    // Update message pin status
    const { data: message, error } = await (adminSupabase
      .from("message") as any)
      .update({ is_pinned: is_pinned })
      .eq("id", params.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating message pin status:", error);
      return NextResponse.json({ error: "Failed to update message" }, { status: 500 });
    }

    return NextResponse.json({ 
      message,
      success: true 
    });
  } catch (error) {
    console.error("Message pin API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
