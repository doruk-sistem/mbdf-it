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
    
    // Check if user can view this room (member or creator)
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

    // Check if user is creator of the room
    const { data: room, error: roomError } = await adminSupabase
      .from('mbdf_room')
      .select('created_by')
      .eq('id', roomId)
      .single();

    if (roomError) {
      console.error('Error fetching room:', roomError);
      return NextResponse.json(
        { error: 'Room not found', success: false },
        { status: 404 }
      );
    }

    const isMember = !!membership;
    const isCreator = (room as any).created_by === user.id;

    // Allow access if user is member or creator
    if (!isMember && !isCreator) {
      return NextResponse.json(
        { error: 'Access denied', success: false },
        { status: 403 }
      );
    }

    // Get user's role if they are a member
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

    // Create signed URLs for file downloads (normalize stored path if it includes bucket prefix)
    const documentsWithUrls = await Promise.all(
      ((documents || []) as any[]).map(async (doc: any) => {
        try {
          const storagePath = doc.file_path?.startsWith('docs/')
            ? doc.file_path.replace(/^docs\//, '')
            : doc.file_path;

          const { data: signedUrlData, error: urlError } = await supabase.storage
            .from('docs')
            .createSignedUrl(storagePath, 3600); // 1 hour expiry

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