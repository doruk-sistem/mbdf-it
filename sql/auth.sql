-- Authentication related SQL functions and triggers

-- Function to handle new user registration
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role, created_at)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    'member',
    now()
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to automatically create profile when user signs up
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Function to handle user deletion (cleanup)
create or replace function public.handle_user_delete()
returns trigger as $$
begin
  -- Log the deletion for audit purposes
  insert into public.audit_log (
    user_id,
    action,
    resource_type,
    resource_id,
    old_values,
    created_at
  ) values (
    old.id,
    'user_deleted',
    'profile',
    old.id,
    jsonb_build_object(
      'email', old.email,
      'deleted_at', now()
    ),
    now()
  );
  
  -- Delete the profile (this will cascade to other related records due to FK constraints)
  delete from public.profiles where id = old.id;
  
  return old;
end;
$$ language plpgsql security definer;

-- Trigger to cleanup profile when user is deleted
drop trigger if exists on_auth_user_deleted on auth.users;
create trigger on_auth_user_deleted
  after delete on auth.users
  for each row execute procedure public.handle_user_delete();

-- Basic RLS policies for auth-related tables
-- Note: Enhanced policies with room access are in policies.sql

-- Basic profile policies (will be enhanced in policies.sql)
drop policy if exists "Users can view profiles in same rooms" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;
drop policy if exists "Users can insert their own profile" on public.profiles;

-- Allow profile creation for the trigger
create policy "Allow profile creation" on public.profiles
  for insert with check (true); -- Trigger creates profiles, so allow all

-- Basic company policies (will be enhanced in policies.sql)  
drop policy if exists "Users can view their own company" on public.company;
drop policy if exists "Authenticated users can create companies" on public.company;
drop policy if exists "Users can update their own company" on public.company;

-- Drop existing functions to avoid conflicts
drop function if exists public.get_current_user_profile();
drop function if exists public.is_onboarding_complete();
drop function if exists public.can_access_room(uuid);
drop function if exists public.get_user_role_in_room(uuid);
drop function if exists public.log_auth_event(text, jsonb);
drop function if exists public.get_user_profile_safe();

-- Function to get current user's profile with company
create or replace function public.get_current_user_profile()
returns table (
  id uuid,
  email text,
  full_name text,
  role public.user_role,
  phone text,
  avatar_url text,
  company_id uuid,
  company_name text,
  company_vat_number text,
  company_address text,
  company_contact_email text,
  company_contact_phone text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
) as $$
begin
  return query
  select 
    p.id,
    p.email,
    p.full_name,
    p.role,
    p.phone,
    p.avatar_url,
    p.company_id,
    c.name as company_name,
    c.vat_number as company_vat_number,
    c.address as company_address,
    c.contact_email as company_contact_email,
    c.contact_phone as company_contact_phone,
    p.created_at,
    p.updated_at
  from public.profiles p
  left join public.company c on p.company_id = c.id
  where p.id = auth.uid();
end;
$$ language plpgsql stable security definer;

-- Function to check if user has completed onboarding
create or replace function public.is_onboarding_complete()
returns boolean as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid()
    and full_name is not null
    and company_id is not null
  );
end;
$$ language plpgsql stable security definer;

-- Function to check if user can access a room
create or replace function public.can_access_room(room_uuid uuid)
returns boolean as $$
begin
  return exists (
    select 1 from public.mbdf_member
    where room_id = room_uuid and user_id = auth.uid()
  );
end;
$$ language plpgsql stable security definer;

-- Function to get user's role in a room
create or replace function public.get_user_role_in_room(room_uuid uuid)
returns public.user_role as $$
declare
  user_role public.user_role;
begin
  select role into user_role
  from public.mbdf_member
  where room_id = room_uuid and user_id = auth.uid();
  
  return coalesce(user_role, 'member');
end;
$$ language plpgsql stable security definer;

-- Enhanced audit logging for auth events
create or replace function public.log_auth_event(
  event_type text,
  event_data jsonb default '{}'::jsonb
)
returns void as $$
begin
  insert into public.audit_log (
    user_id,
    action,
    resource_type,
    metadata,
    created_at
  ) values (
    auth.uid(),
    event_type,
    'auth',
    event_data,
    now()
  );
end;
$$ language plpgsql security definer;

-- Grant necessary permissions
grant usage on schema public to authenticated;
grant usage on schema public to anon;

-- Grant access to auth helper functions
grant execute on function public.get_current_user_profile() to authenticated;
grant execute on function public.is_onboarding_complete() to authenticated;
grant execute on function public.can_access_room(uuid) to authenticated;
grant execute on function public.get_user_role_in_room(uuid) to authenticated;
grant execute on function public.log_auth_event(text, jsonb) to authenticated;

-- Ensure RLS is enabled on auth-related tables
alter table public.profiles enable row level security;
alter table public.company enable row level security;

-- Create indexes for performance
create index if not exists idx_profiles_email on public.profiles(email);
create index if not exists idx_profiles_company_id on public.profiles(company_id);
create index if not exists idx_company_name on public.company(name);

-- Update existing RLS helper functions to work with auth
create or replace function public.current_user_id() returns uuid as $$
  select auth.uid()
$$ language sql stable;

-- Function to safely get user profile (with error handling)
create or replace function public.get_user_profile_safe()
returns table (
  id uuid,
  email text,
  full_name text,
  role public.user_role,
  company_id uuid
) as $$
begin
  return query
  select 
    p.id,
    p.email,
    p.full_name,
    p.role,
    p.company_id
  from public.profiles p
  where p.id = auth.uid();
exception
  when others then
    -- Return empty result if error occurs
    return;
end;
$$ language plpgsql stable security definer;