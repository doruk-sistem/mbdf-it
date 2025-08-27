import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase';
import { sendMail } from '@/lib/email';

const ApproveSchema = z.object({ note: z.string().max(2000).optional() });

interface Params { params: { id: string } }

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const supabase = createServerSupabase();
    const admin = createAdminSupabase();
    const { id } = params;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const input = ApproveSchema.parse(body);

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
      .update({ status: 'approved', decision_by: user.id, decision_note: input.note || null, decided_at: new Date().toISOString() })
      .eq('request_id', id);
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 400 });

    // Upsert membership using admin client
    await admin.from('mbdf_member').upsert({
      room_id: jr.room_id,
      user_id: jr.requester_id,
      role: 'member',
      joined_at: new Date().toISOString(),
    } as any, { onConflict: 'room_id,user_id' } as any);

    // Email requester
    if (jr.requester_id) {
      const { data: requester } = await admin.from('profiles').select('email, full_name').eq('id', jr.requester_id).single();
      const { data: room } = await admin.from('mbdf_room').select('name').eq('id', jr.room_id).single();
      if (requester?.email) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        await sendMail({
          to: requester.email,
          subject: 'MBDF-IT: Odaya katılım başvurunuz onaylandı',
          html: `
            <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Başvurunuz Onaylandı</h2>
              <p><strong>${room?.name || 'Oda'}</strong> odasına üyeliğiniz onaylandı.</p>
              ${input.note ? `<p>Not: ${input.note}</p>` : ''}
              <p><a href="${appUrl}/mbdf/${jr.room_id}">Odayı aç</a></p>
            </div>
          `,
        });
      }
    }

    // Audit log
    await admin.from('audit_log').insert({
      action: 'approve_join_request',
      resource_type: 'join_request',
      resource_id: id,
      room_id: jr.room_id,
      user_id: user.id,
      new_values: { status: 'approved' },
    } as any);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err?.issues) return NextResponse.json({ error: 'Invalid input', details: err.issues }, { status: 400 });
    console.error('Approve join request error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


