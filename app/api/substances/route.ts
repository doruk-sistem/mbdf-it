import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase';

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
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = supabase
      .from('substance')
      .select(`
        id,
        name,
        description,
        cas_number,
        ec_number,
        created_at,
        updated_at
      `)
      .order('name', { ascending: true });

    // Add search filter if provided
    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      query = query.or(`name.ilike.${searchTerm},cas_number.ilike.${searchTerm},ec_number.ilike.${searchTerm}`);
    }

    // Add pagination
    query = query.range(offset, offset + limit - 1);

    const { data: substances, error, count } = await query;

    // console.log("substances", substances);

    if (error) {
      console.error('Error fetching substances:', error);
      return NextResponse.json(
        { error: 'Failed to fetch substances', success: false },
        { status: 500 }
      );
    }

    // Get total count for pagination
    const { count: totalCount } = await supabase
      .from('substance')
      .select('*', { count: 'exact', head: true });

    // Return response directly without strict validation
    const response = {
      items: substances || [],
      total: totalCount || 0,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('API Error in GET /api/substances:', error);
    return NextResponse.json(
      { error: 'Internal server error', success: false },
      { status: 500 }
    );
  }
}
