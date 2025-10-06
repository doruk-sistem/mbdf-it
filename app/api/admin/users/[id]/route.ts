import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// System admin ID for data transfer
// Using existing super admin: mbdfsuperuser@gmail.com (SUPER ADMIN)
const SYSTEM_ADMIN_ID = '5dbbd138-c2a5-4ac0-b7cf-422374bf579c';

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

export async function DELETE(
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

    // Cannot delete yourself
    if (params.id === user.id) {
      return NextResponse.json({ 
        error: 'Cannot delete your own account' 
      }, { status: 400 });
    }

    // Cannot delete system admin
    if (params.id === SYSTEM_ADMIN_ID) {
      return NextResponse.json({ 
        error: 'Cannot delete system admin account' 
      }, { status: 400 });
    }

    // Use admin client for all operations
    const adminSupabase = createAdminSupabase();
    
    // Check if user exists in auth
    const { data: authUser, error: authUserError } = await adminSupabase.auth.admin.getUserById(params.id);
    
    if (authUserError || !authUser.user) {
      return NextResponse.json({ 
        error: 'User not found in authentication system' 
      }, { status: 404 });
    }

    // Get profile data (may not exist)
    const { data: userToDelete } = await (adminSupabase as any)
      .from('profiles')
      .select('email, full_name, company_id')
      .eq('id', params.id)
      .single();

    // Use auth user data as fallback
    const userName = userToDelete?.full_name || authUser.user.email?.split('@')[0] || 'Unknown User';
    const userEmail = userToDelete?.email || authUser.user.email || 'unknown@email.com';
    const userCompanyId = userToDelete?.company_id || null;

    // Store company ID before any deletion (important for later cleanup)
    const companyIdToDelete = userCompanyId;

    // Collect transfer statistics for audit trail
    const transferSummary: any = {};

    // Start transaction-like operations
    // Transfer ownership to system admin for critical data

    // 1. Transfer mbdf_room ownership
    const { data: rooms } = await (adminSupabase as any)
      .from('mbdf_room')
      .select('id, name')
      .eq('created_by', params.id);
    
    if (rooms && rooms.length > 0) {
      transferSummary.mbdf_rooms = {
        count: rooms.length,
        ids: rooms.map((r: any) => r.id),
        names: rooms.map((r: any) => r.name)
      };
      
      await (adminSupabase as any)
        .from('mbdf_room')
        .update({ created_by: SYSTEM_ADMIN_ID })
        .eq('created_by', params.id);
    }

    // 2. Transfer access_package ownership
    const { data: packages } = await (adminSupabase as any)
      .from('access_package')
      .select('id, name')
      .eq('created_by', params.id);
    
    if (packages && packages.length > 0) {
      transferSummary.access_packages = {
        count: packages.length,
        ids: packages.map((p: any) => p.id)
      };
      
      await (adminSupabase as any)
        .from('access_package')
        .update({ created_by: SYSTEM_ADMIN_ID })
        .eq('created_by', params.id);
    }

    // 3. Transfer access_request approvals
    const { data: approvals } = await (adminSupabase as any)
      .from('access_request')
      .select('id')
      .eq('approved_by', params.id);
    
    if (approvals && approvals.length > 0) {
      transferSummary.access_request_approvals = {
        count: approvals.length,
        ids: approvals.map((a: any) => a.id)
      };
      
      await (adminSupabase as any)
        .from('access_request')
        .update({ approved_by: SYSTEM_ADMIN_ID })
        .eq('approved_by', params.id);
    }

    // 4. Transfer document ownership
    const { data: documents } = await (adminSupabase as any)
      .from('document')
      .select('id, name')
      .eq('uploaded_by', params.id);
    
    if (documents && documents.length > 0) {
      transferSummary.documents = {
        count: documents.length,
        ids: documents.map((d: any) => d.id)
      };
      
      await (adminSupabase as any)
        .from('document')
        .update({ uploaded_by: SYSTEM_ADMIN_ID })
        .eq('uploaded_by', params.id);
    }

    // 5. Transfer agreement ownership
    const { data: agreements } = await (adminSupabase as any)
      .from('agreement')
      .select('id, title')
      .eq('created_by', params.id);
    
    if (agreements && agreements.length > 0) {
      transferSummary.agreements = {
        count: agreements.length,
        ids: agreements.map((a: any) => a.id)
      };
      
      await (adminSupabase as any)
        .from('agreement')
        .update({ created_by: SYSTEM_ADMIN_ID })
        .eq('created_by', params.id);
    }

    // 6. Transfer agreement party (if user is party to any agreement)
    const { data: agreementParties } = await (adminSupabase as any)
      .from('agreement_party')
      .select('id')
      .eq('user_id', params.id);
    
    if (agreementParties && agreementParties.length > 0) {
      transferSummary.agreement_parties = {
        count: agreementParties.length,
        ids: agreementParties.map((ap: any) => ap.id)
      };
      
      await (adminSupabase as any)
        .from('agreement_party')
        .update({ user_id: SYSTEM_ADMIN_ID })
        .eq('user_id', params.id);
    }

    // 7. Transfer KKS submissions
    const { data: kksSubmissions } = await (adminSupabase as any)
      .from('kks_submission')
      .select('id, title')
      .eq('created_by', params.id);
    
    if (kksSubmissions && kksSubmissions.length > 0) {
      transferSummary.kks_submissions = {
        count: kksSubmissions.length,
        ids: kksSubmissions.map((k: any) => k.id)
      };
      
      await (adminSupabase as any)
        .from('kks_submission')
        .update({ created_by: SYSTEM_ADMIN_ID })
        .eq('created_by', params.id);
    }

    // 8. Preserve audit_log by removing FK reference to user
    // Set user_id to NULL for all audit_log entries of this user
    // This preserves the audit trail while allowing user deletion
    await (adminSupabase as any)
      .from('audit_log')
      .update({ user_id: null })
      .eq('user_id', params.id);

    // Get company name for transfer record
    let companyName = null;
    if (userCompanyId) {
      const { data: companyData } = await (adminSupabase as any)
        .from('company')
        .select('name')
        .eq('id', userCompanyId)
        .single();
      companyName = companyData?.name || null;
    }

    // Record transfer in dedicated tracking table
    await (adminSupabase as any)
      .from('user_deletion_transfers')
      .insert({
        deleted_user_id: params.id,
        deleted_user_name: userName,
        deleted_user_email: userEmail,
        deleted_user_company: companyName,
        deleted_by: user.id,
        transferred_to: SYSTEM_ADMIN_ID,
        transfer_summary: transferSummary,
        deleted_at: new Date().toISOString(),
      });

    // Log the deletion in audit log BEFORE deleting
    // Use current admin's ID (not the deleted user)
    await (adminSupabase as any)
      .from('audit_log')
      .insert({
        user_id: user.id, // Admin who performed the deletion
        action: 'user_deleted',
        resource_type: 'profile',
        resource_id: params.id,
        old_values: {
          email: userEmail,
          full_name: userName,
          company_id: userCompanyId,
          deleted_by: user.id,
          deleted_at: new Date().toISOString(),
        },
      });

    // IMPORTANT: Delete in correct order to avoid foreign key constraint errors
    // 1. First delete profile manually (this removes the FK reference in user_deletion_transfers)
    const { error: deleteProfileError } = await (adminSupabase as any)
      .from('profiles')
      .delete()
      .eq('id', params.id);

    if (deleteProfileError) {
      console.error('Error deleting profile:', deleteProfileError);
      return NextResponse.json({ 
        error: 'Failed to delete user profile',
        details: deleteProfileError.message 
      }, { status: 500 });
    }

    // 2. Then delete the user from Supabase Auth
    const { error: deleteAuthError } = await adminSupabase.auth.admin.deleteUser(params.id);

    if (deleteAuthError) {
      console.error('Error deleting auth user:', deleteAuthError);
      // If auth delete fails, we already deleted profile - that's OK
      // The user won't be able to login anymore without a profile
    }

    // 3. Delete company (1 company = 1 user model)
    if (companyIdToDelete) {
      const { error: deleteCompanyError } = await (adminSupabase as any)
        .from('company')
        .delete()
        .eq('id', companyIdToDelete);
      
      if (deleteCompanyError) {
        console.error('Error deleting company:', deleteCompanyError);
        // Don't fail the entire request if company delete fails
        // User is already deleted which is the main goal
      }
    }

    // Calculate total transferred items
    const totalTransferred = Object.values(transferSummary).reduce(
      (sum: number, item: any) => sum + (item.count || 0), 
      0
    );

    return NextResponse.json({ 
      success: true,
      message: 'User deleted successfully. Ownership transferred to system admin.',
      transferred_to: SYSTEM_ADMIN_ID,
      transfer_summary: transferSummary,
      total_items_transferred: totalTransferred,
    });

  } catch (error) {
    console.error('Admin user delete API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

