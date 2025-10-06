import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerSupabase();
    
    // Get current user (any authenticated user can view)
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminSupabase = createAdminSupabase();
    const documentId = params.id;

    // Find transfer record that contains this document
    const { data: transfers, error } = await (adminSupabase as any)
      .from('user_deletion_transfers')
      .select('*')
      .order('deleted_at', { ascending: false });

    if (error) {
      console.error('Error fetching transfers:', error);
      return NextResponse.json({ 
        found: false,
        error: 'Failed to fetch transfer data' 
      });
    }

    // Search through transfers to find which one contains this document
    let foundTransfer = null;
    
    if (transfers && transfers.length > 0) {
      for (const transfer of transfers) {
        const summary = transfer.transfer_summary || {};
        
        // Check if this document ID is in the documents list
        if (summary.documents && summary.documents.ids) {
          if (summary.documents.ids.includes(documentId)) {
            foundTransfer = transfer;
            break;
          }
        }
      }
    }

    if (!foundTransfer) {
      return NextResponse.json({ 
        found: false,
        message: 'This document was not transferred (originally uploaded by current owner)' 
      });
    }

    // Return transfer info
    return NextResponse.json({ 
      found: true,
      original_uploader_name: foundTransfer.deleted_user_name,
      original_uploader_email: foundTransfer.deleted_user_email,
      original_company: foundTransfer.deleted_user_company,
      deleted_at: foundTransfer.deleted_at,
      deleted_by: foundTransfer.deleted_by,
      transferred_to: foundTransfer.transferred_to,
    });

  } catch (error) {
    console.error('Transfer info API error:', error);
    return NextResponse.json({ 
      found: false,
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

