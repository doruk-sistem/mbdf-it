import { createClient } from '@supabase/supabase-js';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import type { Database } from '@/types/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Client-side Supabase client
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Admin Supabase client (bypasses RLS)
export const createAdminSupabase = () => {
  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};

// Server-side Supabase client for App Router
export const createServerSupabase = () => {
  // Import cookies dynamically to avoid Next.js import issues in client components
  const { cookies } = require('next/headers');
  const cookieStore = cookies();
  
  return createServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set(name, value, options);
          } catch (error) {
            // Handle cookie setting errors silently
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.delete(name);
          } catch (error) {
            // Handle cookie removal errors silently
          }
        },
      },
    }
  );
};

// Legacy function for backwards compatibility
export const createServerSupabaseClient = (cookieStore: {
  get: (name: string) => { name: string; value: string } | undefined;
  set: (name: string, value: string, options?: Partial<CookieOptions>) => void;
  remove: (name: string, options?: Partial<CookieOptions>) => void;
}) => {
  return createServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set(name, value, options);
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.remove(name, options);
        },
      },
    }
  );
};

// Middleware Supabase client
export const createMiddlewareSupabaseClient = (
  request: NextRequest,
  response: NextResponse
) => {
  return createServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );
};

// Helper to get signed URL for document downloads
export const getSignedUrl = async (path: string, expiresIn = 3600) => {
  const { data, error } = await supabase.storage
    .from('docs')
    .createSignedUrl(path, expiresIn);
  
  if (error) {
    throw new Error(`Failed to get signed URL: ${error.message}`);
  }
  
  return data.signedUrl;
};

// Helper to upload file to storage
export const uploadFile = async (
  bucket: string,
  path: string,
  file: File | Blob,
  options?: { contentType?: string; metadata?: Record<string, any> }
) => {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      contentType: options?.contentType,
      metadata: options?.metadata,
      upsert: false,
    });
  
  if (error) {
    throw new Error(`Failed to upload file: ${error.message}`);
  }
  
  return data;
};

// Helper to delete file from storage
export const deleteFile = async (bucket: string, path: string) => {
  const { error } = await supabase.storage
    .from(bucket)
    .remove([path]);
  
  if (error) {
    throw new Error(`Failed to delete file: ${error.message}`);
  }
};

// Types for common queries
export type RoomWithDetails = Database['public']['Tables']['mbdf_room']['Row'] & {
  substance: Database['public']['Tables']['substance']['Row'];
  created_by_profile: Database['public']['Tables']['profiles']['Row'];
  member_count?: number;
};

export type MemberWithProfile = Database['public']['Tables']['mbdf_member']['Row'] & {
  profiles: Database['public']['Tables']['profiles']['Row'] & {
    company: Database['public']['Tables']['company']['Row'] | null;
  };
};

export type AccessRequestWithDetails = Database['public']['Tables']['access_request']['Row'] & {
  access_package: Database['public']['Tables']['access_package']['Row'];
  profiles: Database['public']['Tables']['profiles']['Row'];
  approved_by_profile?: Database['public']['Tables']['profiles']['Row'];
};

export type DocumentWithUploader = Database['public']['Tables']['document']['Row'] & {
  profiles: Database['public']['Tables']['profiles']['Row'];
};

export type AgreementWithDetails = Database['public']['Tables']['agreement']['Row'] & {
  created_by_profile: Database['public']['Tables']['profiles']['Row'];
  agreement_party: (Database['public']['Tables']['agreement_party']['Row'] & {
    profiles: Database['public']['Tables']['profiles']['Row'];
  })[];
};

export type VotingResult = {
  candidate_id: string;
  user_id: string;
  full_name: string;
  total_score: number;
  vote_count: number;
};