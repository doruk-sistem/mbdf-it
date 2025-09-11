import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase';
import { DocumentsListResponseSchema } from '@/lib/schemas';
import { z } from 'zod';

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
    const roomId = searchParams.get('roomId');

    if (!roomId) {
      return NextResponse.json(
        { error: 'roomId parameter is required', success: false },
        { status: 400 }
      );
    }

    // Use admin client to bypass RLS for access check
    const adminSupabase = createAdminSupabase();
    
    // Allow all authenticated users to view documents
    // Check if user is a member for role-based permissions
    const { data: membership, error: memberError } = await adminSupabase
      .from('mbdf_member')
      .select('id, role')
      .eq('room_id', roomId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (memberError && memberError.code !== 'PGRST116') {
      console.error('Error checking membership:', memberError);
      return NextResponse.json(
        { error: 'Failed to verify access', success: false },
        { status: 500 }
      );
    }

    const isMember = !!membership;
    const userRole = (membership as any)?.role;

    // Get documents with uploader profile using admin client to bypass RLS
    const { data: documents, error } = await adminSupabase
      .from('document')
      .select(`
        *,
        profiles:uploaded_by (*)
      `)
      .eq('room_id', roomId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching documents:', error);
      return NextResponse.json(
        { error: 'Failed to fetch documents', success: false },
        { status: 500 }
      );
    }

    // Create signed URLs for file downloads (only for members)
    const documentsWithUrls = await Promise.all(
      ((documents || []) as any[]).map(async (doc: any) => {
        try {
          // Only create download URLs for members
          if (!isMember) {
            return {
              ...doc,
              download_url: null,
              download_error: "Bu odaya üye olmadığınız için dokümanı indiremezsiniz. İndirmek için odaya üye olmanız gerekmektedir."
            };
          }

          const storagePath = doc.file_path?.startsWith('docs/')
            ? doc.file_path.replace(/^docs\//, '')
            : doc.file_path;

          const { data: signedUrlData, error: urlError } = await supabase.storage
            .from('docs')
            .createSignedUrl(storagePath, 3600); // 1 hour expiry

          return {
            ...doc,
            download_url: urlError ? null : signedUrlData.signedUrl,
            download_error: urlError ? "İndirme linki oluşturulamadı." : null,
          };
        } catch (urlError) {
          console.error('Error creating signed URL for:', doc.file_path, urlError);
          return {
            ...doc,
            download_url: null,
            download_error: "İndirme linki oluşturulamadı.",
          };
        }
      })
    );

    // Validate response and add membership status
    const response = {
      items: documentsWithUrls,
      total: documentsWithUrls.length,
      isMember: isMember
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('API Error in GET /api/documents:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid response format', details: error.issues, success: false },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error', success: false },
      { status: 500 }
    );
  }
}