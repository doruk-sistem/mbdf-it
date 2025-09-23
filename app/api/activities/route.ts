import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase';

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
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const type = searchParams.get('type'); // Filter by activity type

    const adminSupabase = createAdminSupabase();
    const activities: any[] = [];

    // 1. Get rooms created by user
    const { data: createdRooms } = await adminSupabase
      .from('mbdf_room')
      .select(`
        id,
        name,
        created_at,
        substance:substance_id (name)
      `)
      .eq('created_by', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (createdRooms) {
      createdRooms.forEach((room: any) => {
        activities.push({
          id: `room-${room.id}`,
          action: 'Yeni MBDF odası oluşturdunuz',
          user: 'Sen',
          room: room.substance?.name || room.name,
          roomId: room.id,
          time: getTimeAgo(room.created_at),
          type: 'Oluşturma',
          timestamp: new Date(room.created_at).getTime()
        });
      });
    }

    // 2. Get documents uploaded by user
    const { data: uploadedDocs } = await adminSupabase
      .from('document')
      .select(`
        id,
        name,
        created_at,
        room_id,
        mbdf_room!inner (
          id,
          name,
          substance!inner (
            name
          )
        )
      `)
      .eq('uploaded_by', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (uploadedDocs) {
      uploadedDocs.forEach((doc: any) => {
        activities.push({
          id: `doc-${doc.id}`,
          action: 'Belge yüklediniz',
          user: 'Sen',
          room: doc.mbdf_room?.substance?.name || doc.mbdf_room?.name || 'Bilinmeyen',
          roomId: doc.room_id, // Use room_id directly
          documentId: doc.id,
          time: getTimeAgo(doc.created_at),
          type: 'Belge',
          timestamp: new Date(doc.created_at).getTime()
        });
      });
    }

    // 3. Get votes by user
    const { data: userVotes } = await adminSupabase
      .from('vote')
      .select(`
        id,
        created_at,
        mbdf_room:room_id (
          name,
          substance:substance_id (name)
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (userVotes) {
      userVotes.forEach((vote: any) => {
        activities.push({
          id: `vote-${vote.id}`,
          action: 'Oylamaya katıldınız',
          user: 'Sen',
          room: vote.mbdf_room?.substance?.name || vote.mbdf_room?.name || 'Bilinmeyen',
          roomId: vote.mbdf_room?.id,
          time: getTimeAgo(vote.created_at),
          type: 'Oylama',
          timestamp: new Date(vote.created_at).getTime()
        });
      });
    }

    // 4. Get KKS submissions by user
    const { data: kksSubmissions } = await adminSupabase
      .from('kks')
      .select(`
        id,
        created_at,
        mbdf_room:room_id (
          name,
          substance:substance_id (name)
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (kksSubmissions) {
      kksSubmissions.forEach((kks: any) => {
        activities.push({
          id: `kks-${kks.id}`,
          action: 'KKS gönderdiniz',
          user: 'Sen',
          room: kks.mbdf_room?.substance?.name || kks.mbdf_room?.name || 'Bilinmeyen',
          roomId: kks.mbdf_room?.id,
          time: getTimeAgo(kks.created_at),
          type: 'KKS',
          timestamp: new Date(kks.created_at).getTime()
        });
      });
    }



    // 6. Get agreements signed by user
    const { data: agreements } = await adminSupabase
      .from('agreement')
      .select(`
        id,
        created_at,
        status,
        mbdf_room:room_id (
          name,
          substance:substance_id (name)
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (agreements) {
      agreements.forEach((agreement: any) => {
        const statusText = agreement.status === 'signed' ? 'imzaladınız' : 'görüntülediniz';
        activities.push({
          id: `agreement-${agreement.id}`,
          action: `Sözleşme ${statusText}`,
          user: 'Sen',
          room: agreement.mbdf_room?.substance?.name || agreement.mbdf_room?.name || 'Bilinmeyen',
          roomId: agreement.mbdf_room?.id,
          time: getTimeAgo(agreement.created_at),
          type: 'Sözleşme',
          timestamp: new Date(agreement.created_at).getTime()
        });
      });
    }

    // Filter by type if specified
    let filteredActivities = activities;
    if (type) {
      filteredActivities = activities.filter(activity => activity.type === type);
    }

    // Sort by timestamp (most recent first) and apply pagination
    const sortedActivities = filteredActivities
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(offset, offset + limit);

    return NextResponse.json({
      items: sortedActivities,
      total: sortedActivities.length,
      success: true
    });

  } catch (error) {
    console.error('Error fetching activities:', error);
    return NextResponse.json(
      { error: 'Internal server error', success: false },
      { status: 500 }
    );
  }
}

function getTimeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'Az önce';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} dakika önce`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} saat önce`;
  } else if (diffInSeconds < 2592000) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} gün önce`;
  } else {
    const months = Math.floor(diffInSeconds / 2592000);
    return `${months} ay önce`;
  }
}
