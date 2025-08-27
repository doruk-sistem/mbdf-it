import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase';
import { sendMail } from '@/lib/email';

const CreateJoinRequestSchema = z.object({
  roomId: z.string().uuid(),
  message: z.string().max(2000).optional(),
  acceptTerms: z.boolean(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabase();
    const admin = createAdminSupabase();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const input = CreateJoinRequestSchema.parse(body);
    if (!input.acceptTerms) {
      return NextResponse.json({ error: 'You must accept terms' }, { status: 400 });
    }

    // Prevent duplicate pending enforced by unique index; rely on RLS for member check
    const { data: inserted, error } = await supabase
      .from('join_request')
      .insert({
        room_id: input.roomId,
        requester_id: user.id,
        message: input.message || null,
        accept_terms: input.acceptTerms,
      })
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Fetch LR/Admin of room to notify
    const { data: approvers } = await admin
      .from('mbdf_member')
      .select(`profiles:profiles!mbdf_member_user_id_fkey(email, full_name)`)
      .eq('room_id', input.roomId)
      .in('role', ['lr','admin']);

    // Fetch room and substance for email context
    const [{ data: room }, { data: substance }] = await Promise.all([
      admin.from('mbdf_room').select('name').eq('id', input.roomId).single(),
      admin.from('substance').select('name').eq('id', (await admin.from('mbdf_room').select('substance_id').eq('id', input.roomId).single()).data?.substance_id).single().catch(() => ({ data: null })),
    ]);

    const toEmails = (approvers || [])
      .map((a: any) => a.profiles?.email)
      .filter(Boolean);

    if (toEmails.length > 0) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      await sendMail({
        to: toEmails,
        subject: 'MBDF-IT: Yeni Odaya Katılım Başvurusu',
        html: `
          <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Yeni Katılım Başvurusu</h2>
            <p>Oda: <strong>${room?.name || '-'}</strong>${substance?.name ? ` (${substance.name})` : ''}</p>
            <p>Başvuru sahibi: ${user.email}</p>
            ${input.message ? `<p>Mesaj: ${input.message}</p>` : ''}
            <p><a href="${appUrl}/mbdf/${input.roomId}">Odayı aç</a></p>
          </div>
        `,
      });
    }

    // Audit log
    await admin.from('audit_log').insert({
      action: 'create_join_request',
      resource_type: 'join_request',
      resource_id: inserted.request_id,
      room_id: input.roomId,
      user_id: user.id,
      new_values: { message: input.message },
    } as any);

    return NextResponse.json({ success: true, id: inserted.request_id });
  } catch (err: any) {
    if (err?.issues) {
      return NextResponse.json({ error: 'Invalid input', details: err.issues }, { status: 400 });
    }
    console.error('Join request create error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


