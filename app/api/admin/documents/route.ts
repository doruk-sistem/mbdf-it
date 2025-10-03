import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabase();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ 
        error: 'Access denied. Admin privileges required.' 
      }, { status: 403 });
    }

    // Use admin client to get all documents
    const adminSupabase = createAdminSupabase();

    const { data: documents, error } = await adminSupabase
      .from('document')
      .select(`
        id,
        name,
        file_size,
        created_at,
        uploaded_by,
        profiles:uploaded_by (
          full_name,
          email
        ),
        mbdf_room:room_id (
          id,
          name
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching documents:', error);
      return NextResponse.json({ 
        error: 'Failed to fetch documents' 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      documents: documents || []
    });

  } catch (error) {
    console.error('Admin documents API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}




