import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') ?? '/';

  if (code) {
    const cookieStore = cookies();
    const supabase = createServerSupabaseClient(cookieStore);

    try {
      // Exchange the code for a session
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      
      if (error) {
        console.error('Auth callback error:', error);
        return NextResponse.redirect(new URL('/auth/sign-in?error=auth_error', request.url));
      }

      if (data.user) {
        // Ensure profile exists in the database
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, full_name, company_id')
          .eq('id', data.user.id)
          .single();

        // If profile doesn't exist, create it (fallback)
        if (!profile) {
          const { error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: data.user.id,
              email: data.user.email!,
              full_name: null,
              company_id: null,
            });
          
          if (insertError) {
            console.error('Profile creation error:', insertError);
          }
        }

        // Check if user needs onboarding
        if (!profile?.full_name || !profile?.company_id) {
          return NextResponse.redirect(new URL('/onboarding', request.url));
        }

        // User is fully set up, redirect to dashboard or intended destination
        return NextResponse.redirect(new URL(next, request.url));
      }
    } catch (error) {
      console.error('Auth callback unexpected error:', error);
      return NextResponse.redirect(new URL('/auth/sign-in?error=unexpected_error', request.url));
    }
  }

  // If no code or other error, redirect to sign-in
  return NextResponse.redirect(new URL('/auth/sign-in?error=no_code', request.url));
}