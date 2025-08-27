import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase';
import { sendMail } from '@/lib/email';

const RejectSchema = z.object({ note: z.string().max(2000).optional() });

interface Params { params: { id: string } }

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const supabase = createServerSupabase();
    const admin = createAdminSupabase();
    const { id } = params;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const input = RejectSchema.parse(body);

    // Load request
    const { data: jr, error: jrErr } = await supabase
      .from('join_request')
      .select('*')
      .eq('request_id', id)
      .single();
    if (jrErr || !jr) return NextResponse.json({ error: 'Request not found' }, { status: 404 });

    // Update status (RLS ensures only LR/Admin)
    const { error: upErr } = await supabase
      .from('join_request')
      .update({ status: 'rejected', decision_by: user.id, decision_note: input.note || null, decided_at: new Date().toISOString() })
      .eq('request_id', id);
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 400 });

    // Email requester
    if (jr.requester_id) {
      const { data: requester } = await admin.from('profiles').select('email, full_name').eq('id', jr.requester_id).single();
      const { data: room } = await admin.from('mbdf_room').select('name').eq('id', jr.room_id).single();
      if (requester?.email) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        await sendMail({
          to: requester.email,
          subject: 'MBDF-IT: Odaya katılım başvurunuz reddedildi',
          html: `
            <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Başvurunuz Reddedildi</h2>
              <p><strong>${room?.name || 'Oda'}</strong> odasına üyelik başvurunuz reddedildi.</p>
              ${input.note ? `<p>Not: ${input.note}</p>` : ''}
              <p><a href="${appUrl}/rooms/${jr.room_id}">Oda sayfasına dön</a></p>
            </div>
          `,
        });
      }
    }

    // Audit log
    await admin.from('audit_log').insert({
      action: 'reject_join_request',
      resource_type: 'join_request',
      resource_id: id,
      room_id: jr.room_id,
      user_id: user.id,
      new_values: { status: 'rejected' },
    } as any);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err?.issues) return NextResponse.json({ error: 'Invalid input', details: err.issues }, { status: 400 });
    console.error('Reject join request error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


