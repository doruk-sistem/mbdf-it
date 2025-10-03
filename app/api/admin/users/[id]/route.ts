import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Get request body
    const body = await request.json();
    const { full_name, email, phone, company_id, role } = body;

    // Use admin client to update user
    const adminSupabase = createAdminSupabase();

    // Build update object
    const updateData: {
      full_name?: string;
      email?: string;
      phone?: string | null;
      company_id?: string | null;
      role?: string;
      updated_at: string;
    } = {
      updated_at: new Date().toISOString(),
    };

    if (full_name !== undefined) updateData.full_name = full_name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (company_id !== undefined) updateData.company_id = company_id;
    if (role !== undefined) updateData.role = role;

    const { data: updatedUser, error } = await (adminSupabase as any)
      .from('profiles')
      .update(updateData)
      .eq('id', params.id)
      .select(`
        id,
        full_name,
        email,
        phone,
        role,
        created_at,
        updated_at,
        company:company_id (
          id,
          name
        )
      `)
      .single();

    if (error) {
      console.error('Error updating user:', error);
      return NextResponse.json({ 
        error: 'Failed to update user',
        details: error.message 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      user: updatedUser
    });

  } catch (error) {
    console.error('Admin user update API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

