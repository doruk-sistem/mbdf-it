import { NextResponse, type NextRequest } from 'next/server';
import { createMiddlewareSupabaseClient } from '@/lib/supabase';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const pathname = request.nextUrl.pathname;

  // Create Supabase client for middleware
  const supabase = createMiddlewareSupabaseClient(request, response);

  // Get user (more secure than getSession)
  const { data: { user }, error } = await supabase.auth.getUser();

  // Define protected and public routes
  const protectedRoutes = ['/mbdf', '/agreements', '/kks', '/settings', '/onboarding'];
  const authRoutes = ['/auth/sign-in', '/auth/callback'];
  const publicRoutes = ['/api', '/_next', '/favicon.ico'];

  // Check if the current path is protected
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route));
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

  // Allow public routes and API routes
  if (isPublicRoute) {
    return response;
  }

  // Handle authentication routes
  if (isAuthRoute) {
    // If user is already authenticated and trying to access auth pages, redirect to dashboard
    if (user && !error && pathname === '/auth/sign-in') {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return response;
  }

  // Handle protected routes
  if (isProtectedRoute || pathname === '/') {
    // If no user, redirect to sign-in
    if (!user || error) {
      const signInUrl = new URL('/auth/sign-in', request.url);
      // Store the intended destination
      if (pathname !== '/') {
        signInUrl.searchParams.set('next', pathname);
      }
      return NextResponse.redirect(signInUrl);
    }

    // If user has session but trying to access onboarding directly, check if they need it
    if (pathname === '/onboarding') {
      return response; // Let the page component handle the redirect logic
    }

    // For dashboard and other protected routes, check if user completed onboarding
    if (pathname === '/' || pathname.startsWith('/mbdf') || pathname.startsWith('/agreements') || pathname.startsWith('/kks') || pathname.startsWith('/settings')) {
      // We can't easily check profile completion in middleware due to RLS,
      // so we'll let the page components handle onboarding redirects
      return response;
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};