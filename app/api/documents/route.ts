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
    // No membership check needed - all users can access documents
    const isMember = true; // Always true for authenticated users
    const userRole = 'member'; // Default role for access

    // Get documents with uploader profile using admin client to bypass RLS
    console.log('=== DOCUMENTS API DEBUG START ===');
    console.log('Room ID:', roomId);
    
    const { data: documents, error } = await adminSupabase
      .from('document')
      .select(`
        *,
        profiles:uploaded_by (*)
      `)
      .eq('room_id', roomId)
      .order('created_at', { ascending: false });

    console.log('Documents fetch result:', {
      documentsCount: documents?.length || 0,
      documents: documents?.map((doc: any) => ({
        id: doc.id,
        name: doc.name,
        file_path: doc.file_path,
        original_name: doc.original_name,
        mime_type: doc.mime_type
      })),
      error
    });

    if (error) {
      console.error('Error fetching documents:', error);
      return NextResponse.json(
        { error: 'Failed to fetch documents', success: false },
        { status: 500 }
      );
    }

    // Create signed URLs for file downloads (all authenticated users can download)
    const documentsWithUrls = await Promise.all(
      ((documents || []) as any[]).map(async (doc: any) => {
        try {
          // All authenticated users can download documents
          const storagePath = doc.file_path?.startsWith('docs/')
            ? doc.file_path.replace(/^docs\//, '')
            : doc.file_path;

          // Try to create signed URL with admin client first
          const { data: signedUrlData, error: urlError } = await adminSupabase.storage
            .from('docs')
            .createSignedUrl(storagePath, 3600); // 1 hour expiry

          if (urlError) {
            console.error('Error creating signed URL with admin client:', urlError);
            // Fallback: try with regular client
            const { data: fallbackUrlData, error: fallbackError } = await supabase.storage
              .from('docs')
              .createSignedUrl(storagePath, 3600);
            
            return {
              ...doc,
              download_url: fallbackError ? null : fallbackUrlData.signedUrl,
              download_error: fallbackError ? "İndirme linki oluşturulamadı." : null,
            };
          }

          return {
            ...doc,
            download_url: signedUrlData.signedUrl,
            download_error: null,
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