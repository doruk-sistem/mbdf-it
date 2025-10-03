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
    const { name, vat_number, address, contact_email, contact_phone } = body;

    // Use admin client to update company
    const adminSupabase = createAdminSupabase();

    // Build update object
    const updateData: {
      name?: string;
      vat_number?: string;
      address?: string;
      contact_email?: string;
      contact_phone?: string;
      updated_at: string;
    } = {
      updated_at: new Date().toISOString(),
    };

    if (name !== undefined) updateData.name = name;
    if (vat_number !== undefined) updateData.vat_number = vat_number;
    if (address !== undefined) updateData.address = address;
    if (contact_email !== undefined) updateData.contact_email = contact_email;
    if (contact_phone !== undefined) updateData.contact_phone = contact_phone;

    const { data: updatedCompany, error } = await (adminSupabase as any)
      .from('company')
      .update(updateData)
      .eq('id', params.id)
      .select(`
        id,
        name,
        vat_number,
        address,
        contact_email,
        contact_phone,
        created_at,
        updated_at
      `)
      .single();

    if (error) {
      console.error('Error updating company:', error);
      return NextResponse.json({ 
        error: 'Failed to update company',
        details: error.message 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      company: updatedCompany
    });

  } catch (error) {
    console.error('Admin company update API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

