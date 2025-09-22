import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabase();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', success: false },
        { status: 401 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Use admin client to bypass RLS for access check
    const adminSupabase = createAdminSupabase();
    
    // Get documents uploaded by the current user using admin client to bypass RLS
    const { data: documents, error } = await adminSupabase
      .from('document')
      .select(`
        id,
        name,
        description,
        file_path,
        file_size,
        mime_type,
        created_at,
        updated_at,
        room_id,
        uploaded_by,
        mbdf_room:room_id (
          id,
          name,
          substance:substance_id (
            name,
            cas_number,
            ec_number
          )
        )
      `)
      .eq('uploaded_by', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('❌ Error fetching user documents:', error);
      return NextResponse.json(
        { error: 'Failed to fetch documents', success: false },
        { status: 500 }
      );
    }


    // Get total count
    const { count, error: countError } = await adminSupabase
      .from('document')
      .select('*', { count: 'exact', head: true })
      .eq('uploaded_by', user.id);  

    if (countError) {
      console.error('❌ Error counting user documents:', countError);
    }


    return NextResponse.json({
      items: documents || [],
      total: count || 0,
      success: true
    });

  } catch (error) {
    console.error('💥 CRITICAL ERROR in user documents API:', error);
    return NextResponse.json(
      { error: 'Internal server error', success: false },
      { status: 500 }
    );
  }
}
