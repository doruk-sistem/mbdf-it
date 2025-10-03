import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase';

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

    // Use admin client to bypass RLS for statistics
    const adminSupabase = createAdminSupabase();

    // Get total users count
    const { count: totalUsers } = await adminSupabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    // Get total companies count
    const { count: totalCompanies } = await adminSupabase
      .from('company')
      .select('*', { count: 'exact', head: true });

    // Get total rooms count
    const { count: totalRooms } = await adminSupabase
      .from('mbdf_room')
      .select('*', { count: 'exact', head: true });

    // Get active rooms count
    const { count: activeRooms } = await adminSupabase
      .from('mbdf_room')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    // Get archived rooms count
    const { count: archivedRooms } = await adminSupabase
      .from('mbdf_room')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'archived');

    // Get total documents count
    const { count: totalDocuments } = await adminSupabase
      .from('document')
      .select('*', { count: 'exact', head: true });

    // Get pending access requests count
    const { count: pendingAccessRequests } = await adminSupabase
      .from('access_request')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    // Get pending join requests count (if you have a join_request table)
    // For now, we'll set it to 0 as we don't have that table in the schema
    const pendingJoinRequests = 0;

    const stats = {
      total_users: totalUsers || 0,
      total_companies: totalCompanies || 0,
      total_rooms: totalRooms || 0,
      active_rooms: activeRooms || 0,
      archived_rooms: archivedRooms || 0,
      total_documents: totalDocuments || 0,
      pending_access_requests: pendingAccessRequests || 0,
      pending_join_requests: pendingJoinRequests,
    };

    return NextResponse.json({ 
      success: true,
      stats 
    });

  } catch (error) {
    console.error('Admin stats API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}


