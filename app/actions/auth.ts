"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase';
import { sendMail } from '@/lib/email';
import { emailTemplates } from '@/lib/email-templates';
import type { Database } from '@/types/supabase';

interface OnboardingData {
  fullName: string;
  companyName: string;
  country: string;
  vatNumber?: string | null;
  address?: string | null;
  contactPhone?: string | null;
}

// Send magic link for authentication
export async function sendMagicLink(email: string) {
  const supabase = createServerSupabase();

  try {
    // Check if we have custom email service configured
    const hasResendKey = process.env.RESEND_API_KEY;
    
    if (hasResendKey) {
      // Generate OTP token manually for custom email
      const { data, error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
        },
      });

      if (error) {
        console.error("Magic link error:", error);
        return {
          success: false,
          error: error.message === "Email not confirmed" 
            ? "Lütfen e-posta adresinizi doğrulayın."
            : "E-posta gönderimi başarısız. Lütfen tekrar deneyin.",
        };
      }

      // Don't send custom email for now, let Supabase handle it
      // We can customize later with email templates
      return { success: true };
      
    } else {
      // Use default Supabase email
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
        },
      });

      if (error) {
        console.error("Magic link error:", error);
        return {
          success: false,
          error: error.message === "Email not confirmed" 
            ? "Lütfen e-posta adresinizi doğrulayın."
            : "E-posta gönderimi başarısız. Lütfen tekrar deneyin.",
        };
      }

      return { success: true };
    }
  } catch (error) {
    console.error("Unexpected magic link error:", error);
    return {
      success: false,
      error: "Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.",
    };
  }
}

// Complete user onboarding
export async function completeOnboarding(data: OnboardingData) {
  const supabase = createServerSupabase();

  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return {
        success: false,
        error: "Kullanıcı oturumu bulunamadı. Lütfen tekrar giriş yapın.",
      };
    }

    // Check if company already exists
    let companyId: string;
    const { data: existingCompany } = await supabase
      .from("company")
      .select("id")
      .eq("name", data.companyName)
      .single();

    if (existingCompany) {
      companyId = existingCompany.id;
    } else {
      // Create new company using admin client to bypass RLS
      const adminSupabase = createAdminSupabase();
      
      const { data: newCompany, error: companyError } = await adminSupabase
        .from("company")
        .insert({
          name: data.companyName,
          vat_number: data.vatNumber || null,
          address: data.address || null,
          contact_phone: data.contactPhone || null,
        } as any)
        .select("id")
        .single();

      if (companyError) {
        console.error("Company creation error:", companyError);
        return {
          success: false,
          error: "Şirket oluşturulamadı. Lütfen tekrar deneyin.",
        };
      }

      companyId = (newCompany as any).id;
    }

    // Update user profile
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        full_name: data.fullName,
        company_id: companyId,
      })
      .eq("id", user.id);

    if (profileError) {
      console.error("Profile update error:", profileError);
      return {
        success: false,
        error: "Profil güncellenemedi. Lütfen tekrar deneyin.",
      };
    }

    // Log the onboarding completion
    await supabase
      .from("audit_log")
      .insert({
        user_id: user.id,
        action: "onboarding_completed",
        resource_type: "profile",
        resource_id: user.id,
        new_values: {
          full_name: data.fullName,
          company_id: companyId,
          company_name: data.companyName,
        },
      });

    return { success: true };
  } catch (error) {
    console.error("Onboarding error:", error);
    return {
      success: false,
      error: "Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.",
    };
  }
}

// Sign out user
export async function signOut() {
  const supabase = createServerSupabase();

  try {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error("Sign out error:", error);
      throw new Error("Çıkış yapılamadı.");
    }
  } catch (error) {
    console.error("Sign out error:", error);
    throw new Error("Çıkış yapılırken bir hata oluştu.");
  }

  // Clear any cached data
  revalidatePath("/", "layout");
  
  // Redirect to sign-in page
  redirect("/auth/sign-in");
}

// Get current user profile
export async function getCurrentUserProfile() {
  const supabase = createServerSupabase();

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return null;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select(`
        *,
        company:company_id (
          id,
          name,
          vat_number,
          address,
          contact_email,
          contact_phone
        )
      `)
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("Profile fetch error:", profileError);
      return null;
    }

    return {
      user,
      profile,
    };
  } catch (error) {
    console.error("Get user profile error:", error);
    return null;
  }
}

// Update user profile
export async function updateUserProfile(formData: FormData) {
  const supabase = createServerSupabase();

  const fullName = formData.get("fullName") as string;
  const phone = formData.get("phone") as string;

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      throw new Error("Kullanıcı oturumu bulunamadı.");
    }

    // Get old values for audit
    const { data: oldProfile } = await supabase
      .from("profiles")
      .select("full_name, phone")
      .eq("id", user.id)
      .single();

    // Update profile
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        phone: phone || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (error) {
      console.error("Profile update error:", error);
      throw new Error("Profil güncellenemedi.");
    }

    // Log the update
    await supabase
      .from("audit_log")
      .insert({
        user_id: user.id,
        action: "profile_updated",
        resource_type: "profile",
        resource_id: user.id,
        old_values: oldProfile,
        new_values: { full_name: fullName, phone },
      });

    revalidatePath("/settings");
  } catch (error) {
    console.error("Update profile error:", error);
    throw new Error("Profil güncellenirken bir hata oluştu.");
  }
}

// Update company information
export async function updateCompanyInfo(formData: FormData) {
  const supabase = createServerSupabase();

  const name = formData.get("name") as string;
  const vatNumber = formData.get("vatNumber") as string;
  const address = formData.get("address") as string;
  const contactEmail = formData.get("contactEmail") as string;
  const contactPhone = formData.get("contactPhone") as string;

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      throw new Error("Kullanıcı oturumu bulunamadı.");
    }

    // Get user's company ID
    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", user.id)
      .single();

    if (!profile?.company_id) {
      throw new Error("Şirket bilgisi bulunamadı.");
    }

    // Get old values for audit
    const { data: oldCompany } = await supabase
      .from("company")
      .select("name, vat_number, address, contact_email, contact_phone")
      .eq("id", profile.company_id)
      .single();

    // Update company
    const { error } = await supabase
      .from("company")
      .update({
        name,
        vat_number: vatNumber || null,
        address: address || null,
        contact_email: contactEmail || null,
        contact_phone: contactPhone || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", profile.company_id);

    if (error) {
      console.error("Company update error:", error);
      throw new Error("Şirket bilgileri güncellenemedi.");
    }

    // Log the update
    await supabase
      .from("audit_log")
      .insert({
        user_id: user.id,
        action: "company_updated",
        resource_type: "company",
        resource_id: profile.company_id,
        old_values: oldCompany,
        new_values: { name, vat_number: vatNumber, address, contact_email: contactEmail, contact_phone: contactPhone },
      });

    revalidatePath("/settings");
  } catch (error) {
    console.error("Update company error:", error);
    throw new Error("Şirket bilgileri güncellenirken bir hata oluştu.");
  }
}