-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- Create custom types
create type user_role as enum ('admin', 'lr', 'member');
create type room_status as enum ('active', 'closed', 'archived');
create type request_status as enum ('pending', 'approved', 'rejected');
create type signature_status as enum ('pending', 'signed', 'rejected');
create type kks_status as enum ('draft', 'submitted', 'sent');

-- Company table
create table if not exists public.company (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  vat_number text,
  address text,
  contact_email text,
  contact_phone text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Profiles table (extends Supabase auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid references public.company(id),
  email text not null,
  full_name text,
  role user_role default 'member',
  avatar_url text,
  phone text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Substance table
create table if not exists public.substance (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  ec_number text,
  cas_number text,
  description text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- MBDF Room table
create table if not exists public.mbdf_room (
  id uuid primary key default uuid_generate_v4(),
  substance_id uuid references public.substance(id) not null,
  name text not null,
  description text,
  status room_status default 'active',
  created_by uuid references public.profiles(id) not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- MBDF Room membership
create table if not exists public.mbdf_member (
  id uuid primary key default uuid_generate_v4(),
  room_id uuid references public.mbdf_room(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  role user_role default 'member',
  joined_at timestamp with time zone default now(),
  unique(room_id, user_id)
);

-- LR Candidates
create table if not exists public.lr_candidate (
  id uuid primary key default uuid_generate_v4(),
  room_id uuid references public.mbdf_room(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  is_selected boolean default false,
  created_at timestamp with time zone default now()
);

-- LR Voting
create table if not exists public.lr_vote (
  id uuid primary key default uuid_generate_v4(),
  room_id uuid references public.mbdf_room(id) on delete cascade not null,
  voter_id uuid references public.profiles(id) on delete cascade not null,
  candidate_id uuid references public.lr_candidate(id) on delete cascade not null,
  technical_score integer check (technical_score >= 0 and technical_score <= 5),
  experience_score integer check (experience_score >= 0 and experience_score <= 5),
  availability_score integer check (availability_score >= 0 and availability_score <= 5),
  communication_score integer check (communication_score >= 0 and communication_score <= 5),
  leadership_score integer check (leadership_score >= 0 and leadership_score <= 5),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(room_id, voter_id, candidate_id)
);

-- Access Packages
create table if not exists public.access_package (
  id uuid primary key default uuid_generate_v4(),
  room_id uuid references public.mbdf_room(id) on delete cascade not null,
  name text not null,
  description text,
  package_data jsonb,
  created_by uuid references public.profiles(id) not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Access Requests
create table if not exists public.access_request (
  id uuid primary key default uuid_generate_v4(),
  package_id uuid references public.access_package(id) on delete cascade not null,
  requester_id uuid references public.profiles(id) on delete cascade not null,
  status request_status default 'pending',
  justification text,
  access_token text,
  approved_by uuid references public.profiles(id),
  approved_at timestamp with time zone,
  rejected_reason text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Documents
create table if not exists public.document (
  id uuid primary key default uuid_generate_v4(),
  room_id uuid references public.mbdf_room(id) on delete cascade not null,
  name text not null,
  description text,
  file_path text not null,
  file_size bigint,
  mime_type text,
  uploaded_by uuid references public.profiles(id) not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Messages/Communications
create table if not exists public.message (
  id uuid primary key default uuid_generate_v4(),
  room_id uuid references public.mbdf_room(id) on delete cascade not null,
  sender_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  message_type text default 'text',
  attachments jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Audit Log
create table if not exists public.audit_log (
  id uuid primary key default uuid_generate_v4(),
  room_id uuid references public.mbdf_room(id),
  user_id uuid references public.profiles(id),
  action text not null,
  resource_type text,
  resource_id uuid,
  old_values jsonb,
  new_values jsonb,
  metadata jsonb,
  created_at timestamp with time zone default now()
);

-- Agreements table
create table if not exists public.agreement (
  id uuid primary key default uuid_generate_v4(),
  room_id uuid references public.mbdf_room(id) on delete cascade not null,
  title text not null,
  description text,
  content text not null,
  agreement_type text default 'general',
  created_by uuid references public.profiles(id) not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Agreement parties
create table if not exists public.agreement_party (
  id uuid primary key default uuid_generate_v4(),
  agreement_id uuid references public.agreement(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  signature_status signature_status default 'pending',
  signed_at timestamp with time zone,
  signature_data jsonb,
  created_at timestamp with time zone default now(),
  unique(agreement_id, user_id)
);

-- Agreement signatures
create table if not exists public.agreement_signature (
  id uuid primary key default uuid_generate_v4(),
  agreement_id uuid references public.agreement(id) on delete cascade not null,
  party_id uuid references public.agreement_party(id) on delete cascade not null,
  signature_method text, -- 'electronic', 'kep', etc.
  signature_hash text,
  signed_pdf_path text,
  provider_response jsonb,
  created_at timestamp with time zone default now()
);

-- KEP notifications
create table if not exists public.kep_notification (
  id uuid primary key default uuid_generate_v4(),
  agreement_id uuid references public.agreement(id) on delete cascade not null,
  recipient_id uuid references public.profiles(id) on delete cascade not null,
  kep_address text not null,
  subject text not null,
  content text not null,
  sent_at timestamp with time zone,
  status text default 'pending',
  provider_response jsonb,
  created_at timestamp with time zone default now()
);

-- KKS submissions
create table if not exists public.kks_submission (
  id uuid primary key default uuid_generate_v4(),
  room_id uuid references public.mbdf_room(id) on delete cascade not null,
  title text not null,
  description text,
  submission_data jsonb not null,
  status kks_status default 'draft',
  created_by uuid references public.profiles(id) not null,
  submitted_at timestamp with time zone,
  sent_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- KKS evidence files
create table if not exists public.kks_evidence (
  id uuid primary key default uuid_generate_v4(),
  submission_id uuid references public.kks_submission(id) on delete cascade not null,
  file_type text not null, -- 'csv', 'pdf'
  file_path text not null,
  file_hash text,
  generated_at timestamp with time zone default now()
);

-- Create indexes for performance
create index if not exists idx_profiles_company_id on public.profiles(company_id);
create index if not exists idx_mbdf_member_room_id on public.mbdf_member(room_id);
create index if not exists idx_mbdf_member_user_id on public.mbdf_member(user_id);
create index if not exists idx_lr_candidate_room_id on public.lr_candidate(room_id);
create index if not exists idx_lr_vote_room_id on public.lr_vote(room_id);
create index if not exists idx_access_package_room_id on public.access_package(room_id);
create index if not exists idx_access_request_package_id on public.access_request(package_id);
create index if not exists idx_document_room_id on public.document(room_id);
create index if not exists idx_message_room_id on public.message(room_id);
create index if not exists idx_audit_log_room_id on public.audit_log(room_id);
create index if not exists idx_agreement_room_id on public.agreement(room_id);
create index if not exists idx_agreement_party_agreement_id on public.agreement_party(agreement_id);
create index if not exists idx_kks_submission_room_id on public.kks_submission(room_id);