import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase';
import { DocumentsListResponseSchema } from '@/lib/schemas';
import { z } from 'zod';

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

    // Check if user has access to this room
    const { data: membership, error: memberError } = await supabase
      .from('mbdf_member')
      .select('id')
      .eq('room_id', roomId)
      .eq('user_id', user.id)
      .single();

    if (memberError) {
      return NextResponse.json(
        { error: 'Access denied', success: false },
        { status: 403 }
      );
    }

    // Get documents with uploader profile
    const { data: documents, error } = await supabase
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

    // Create signed URLs for file downloads
    const documentsWithUrls = await Promise.all(
      (documents || []).map(async (doc) => {
        try {
          const { data: signedUrlData, error: urlError } = await supabase.storage
            .from('docs')
            .createSignedUrl(doc.file_path, 3600); // 1 hour expiry

          return {
            ...doc,
            download_url: urlError ? null : signedUrlData.signedUrl,
          };
        } catch (urlError) {
          console.error('Error creating signed URL for:', doc.file_path, urlError);
          return {
            ...doc,
            download_url: null,
          };
        }
      })
    );

    // Validate response
    const response = DocumentsListResponseSchema.parse({
      items: documentsWithUrls,
      total: documentsWithUrls.length,
    });

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