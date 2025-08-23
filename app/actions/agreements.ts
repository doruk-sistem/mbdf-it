"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServerSupabase } from '@/lib/supabase';
import { sendMail } from '@/lib/email';
import { emailTemplates } from '@/lib/email-templates';
import type { Database } from '@/types/supabase';

type Agreement = Database['public']['Tables']['agreement']['Row'];
type AgreementInsert = Database['public']['Tables']['agreement']['Insert'];
type AgreementParty = Database['public']['Tables']['agreement_party']['Row'];

// Create a new agreement
export async function createAgreement(data: {
  roomId: string;
  title: string;
  description: string;
  content: string;
  agreementType: string;
  partyIds: string[];
}) {
  const supabase = createServerSupabase();

  try {
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Kimlik doğrulama gerekli" };
    }

    // Use the SQL function to create agreement with parties
    const { data: agreementId, error } = await supabase.rpc('create_agreement_with_parties', {
      p_room_id: data.roomId,
      p_title: data.title,
      p_description: data.description,
      p_content: data.content,
      p_agreement_type: data.agreementType,
      p_party_ids: data.partyIds
    });

    if (error) {
      console.error("Agreement creation error:", error);
      return { success: false, error: "Sözleşme oluşturulamadı" };
    }

    // Send notification emails to parties
    if (data.partyIds.length > 0) {
      try {
        // Get party details for email notifications
        const { data: parties, error: partiesError } = await supabase
          .from('profiles')
          .select('email, full_name')
          .in('id', data.partyIds);

        if (parties && !partiesError) {
          const emailPromises = parties.map(party => 
            sendMail({
              to: party.email,
              subject: emailTemplates.agreementCreated.subject(data.title),
              html: emailTemplates.agreementCreated.html(
                party.full_name || party.email,
                data.title,
                agreementId,
                `${process.env.NEXT_PUBLIC_SITE_URL}/agreements/${agreementId}`
              )
            })
          );

          await Promise.allSettled(emailPromises);
        }
      } catch (emailError) {
        console.error("Failed to send agreement notification emails:", emailError);
        // Don't fail the main operation if emails fail
      }
    }

    revalidatePath('/agreements');
    return { success: true, agreementId };

  } catch (error) {
    console.error("Create agreement error:", error);
    return { success: false, error: "Beklenmeyen bir hata oluştu" };
  }
}

// Get agreement details
export async function getAgreementDetail(agreementId: string) {
  const supabase = createServerSupabase();

  try {
    // Check user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Kimlik doğrulama gerekli" };
    }

    // Get agreement with related data
    const { data: agreement, error } = await supabase
      .from('agreement')
      .select(`
        *,
        room:mbdf_room(
          name,
          substance(name, ec_number, cas_number)
        ),
        created_by:profiles!agreement_created_by_fkey(
          full_name,
          email,
          company(name)
        ),
        parties:agreement_party(
          id,
          signature_status,
          signed_at,
          user:profiles(
            full_name,
            email,
            company(name)
          )
        )
      `)
      .eq('id', agreementId)
      .single();

    if (error) {
      console.error("Get agreement error:", error);
      return { success: false, error: "Sözleşme bulunamadı" };
    }

    return { success: true, data: agreement };

  } catch (error) {
    console.error("Get agreement detail error:", error);
    return { success: false, error: "Beklenmeyen bir hata oluştu" };
  }
}

// Sign agreement
export async function signAgreement(agreementId: string, signatureData?: any) {
  const supabase = createServerSupabase();

  try {
    // Check user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Kimlik doğrulama gerekli" };
    }

    // Use the SQL function to sign agreement
    const { data: success, error } = await supabase.rpc('sign_agreement', {
      p_agreement_id: agreementId,
      p_signature_method: 'electronic',
      p_signature_data: signatureData
    });

    if (error || !success) {
      console.error("Agreement signing error:", error);
      return { success: false, error: "İmzalama başarısız" };
    }

    // Send notification emails to other parties
    try {
      // Get agreement and party details
      const { data: agreement } = await supabase
        .from('agreement')
        .select(`
          title,
          parties:agreement_party(
            user:profiles(email, full_name),
            signature_status
          )
        `)
        .eq('id', agreementId)
        .single();

      if (agreement) {
        // Notify unsigned parties
        const unsignedParties = agreement.parties?.filter(
          (p: any) => p.signature_status !== 'signed' && p.user.email !== user.email
        );

        if (unsignedParties?.length > 0) {
          const emailPromises = unsignedParties.map((party: any) => 
            sendMail({
              to: party.user.email,
              subject: emailTemplates.agreementSigned.subject(agreement.title),
              html: emailTemplates.agreementSigned.html(
                party.user.full_name || party.user.email,
                agreement.title,
                user.user_metadata?.full_name || user.email,
                agreementId,
                `${process.env.NEXT_PUBLIC_SITE_URL}/agreements/${agreementId}`
              )
            })
          );

          await Promise.allSettled(emailPromises);
        }
      }
    } catch (emailError) {
      console.error("Failed to send signature notification emails:", emailError);
    }

    revalidatePath(`/agreements/${agreementId}`);
    revalidatePath('/agreements');
    
    return { success: true };

  } catch (error) {
    console.error("Sign agreement error:", error);
    return { success: false, error: "Beklenmeyen bir hata oluştu" };
  }
}

// Request signature from parties
export async function requestSignature(agreementId: string) {
  const supabase = createServerSupabase();

  try {
    // Check user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Kimlik doğrulama gerekli" };
    }

    // Get agreement and unsigned parties
    const { data: agreement, error } = await supabase
      .from('agreement')
      .select(`
        title,
        parties:agreement_party(
          user:profiles(email, full_name),
          signature_status
        )
      `)
      .eq('id', agreementId)
      .single();

    if (error || !agreement) {
      return { success: false, error: "Sözleşme bulunamadı" };
    }

    // Find unsigned parties
    const unsignedParties = agreement.parties?.filter(
      (p: any) => p.signature_status !== 'signed'
    ) || [];

    if (unsignedParties.length === 0) {
      return { success: false, error: "Tüm taraflar zaten imzalamış" };
    }

    // Send signature request emails
    const emailPromises = unsignedParties.map((party: any) => 
      sendMail({
        to: party.user.email,
        subject: emailTemplates.signatureRequest.subject(agreement.title),
        html: emailTemplates.signatureRequest.html(
          party.user.full_name || party.user.email,
          agreement.title,
          agreementId,
          `${process.env.NEXT_PUBLIC_SITE_URL}/agreements/${agreementId}`
        )
      })
    );

    await Promise.allSettled(emailPromises);

    // Log the action
    await supabase.from('audit_log').insert({
      room_id: null, // Could be fetched if needed
      user_id: user.id,
      action: 'signature_requested',
      resource_type: 'agreement',
      resource_id: agreementId,
      metadata: {
        parties_count: unsignedParties.length,
        timestamp: new Date().toISOString()
      }
    });

    return { success: true, message: `${unsignedParties.length} kişiye imza talebi gönderildi` };

  } catch (error) {
    console.error("Request signature error:", error);
    return { success: false, error: "İmza talebi gönderilemedi" };
  }
}

// Send KEP notification
export async function sendKepNotification(agreementId: string, kepAddresses: string[]) {
  const supabase = createServerSupabase();

  try {
    // Check user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Kimlik doğrulama gerekli" };
    }

    // Get agreement details
    const { data: agreement, error } = await supabase
      .from('agreement')
      .select('title, description')
      .eq('id', agreementId)
      .single();

    if (error || !agreement) {
      return { success: false, error: "Sözleşme bulunamadı" };
    }

    // Create KEP notifications (mock implementation)
    const kepPromises = kepAddresses.map(kepAddress => 
      supabase.rpc('send_kep_notification', {
        p_agreement_id: agreementId,
        p_recipient_id: user.id, // This should be the actual recipient
        p_kep_address: kepAddress,
        p_subject: `KEP Bildirimi: ${agreement.title}`,
        p_content: `Sayın Yetkili,\n\n"${agreement.title}" başlıklı sözleşme hakkında bilgi vermek isteriz.\n\n${agreement.description}\n\nDetaylar için: ${process.env.NEXT_PUBLIC_SITE_URL}/agreements/${agreementId}\n\nSaygılarımızla,\nMBDF-IT Sistemi`
      })
    );

    const results = await Promise.allSettled(kepPromises);
    const successCount = results.filter(r => r.status === 'fulfilled').length;

    revalidatePath(`/agreements/${agreementId}`);

    return { 
      success: true, 
      message: `${successCount}/${kepAddresses.length} KEP bildirimi gönderildi` 
    };

  } catch (error) {
    console.error("Send KEP notification error:", error);
    return { success: false, error: "KEP bildirimi gönderilemedi" };
  }
}

// Get agreements list
export async function getAgreements(roomId?: string) {
  const supabase = createServerSupabase();

  try {
    // Check user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Kimlik doğrulama gerekli" };
    }

    let query = supabase
      .from('agreement')
      .select(`
        *,
        room:mbdf_room(name),
        created_by:profiles!agreement_created_by_fkey(full_name),
        parties:agreement_party(
          id,
          signature_status,
          signed_at,
          user:profiles(full_name, email)
        )
      `)
      .order('created_at', { ascending: false });

    if (roomId) {
      query = query.eq('room_id', roomId);
    }

    const { data: agreements, error } = await query;

    if (error) {
      console.error("Get agreements error:", error);
      return { success: false, error: "Sözleşmeler getirilemedi" };
    }

    return { success: true, data: agreements };

  } catch (error) {
    console.error("Get agreements error:", error);
    return { success: false, error: "Beklenmeyen bir hata oluştu" };
  }
}