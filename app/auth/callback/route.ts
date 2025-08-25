import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') ?? '/';

  if (!code) {
    return NextResponse.redirect(new URL('/auth/sign-in?error=no_auth_params', request.url));
  }

  const supabase = createServerSupabase();
  try {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error('Auth callback error:', error);
      return NextResponse.redirect(new URL('/auth/sign-in?error=auth_error', request.url));
    }

    if (!data.user) {
      return NextResponse.redirect(new URL('/auth/sign-in?error=no_user', request.url));
    }

    // Ensure profile exists (trigger should handle, but safe fallback)
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, company_id')
      .eq('id', data.user.id)
      .single();

    if (!profile) {
      const { error: insertError } = await supabase
        .from('profiles')
        .insert({ id: data.user.id, email: data.user.email!, full_name: null, company_id: null });
      if (insertError) {
        console.error('Profile creation error:', insertError);
      }
    }

    if (next) {
      // If next is reset-password, go there directly
      if (next.startsWith('/auth/reset-password')) {
        return NextResponse.redirect(new URL(next, request.url));
      }
    }

    // Onboarding check
    const needsOnboarding = !profile?.full_name || !profile?.company_id;
    if (needsOnboarding) {
      return NextResponse.redirect(new URL('/onboarding', request.url));
    }

    return NextResponse.redirect(new URL(next || '/', request.url));
  } catch (error) {
    console.error('Auth callback unexpected error:', error);
    return NextResponse.redirect(new URL('/auth/sign-in?error=unexpected_error', request.url));
  }
}