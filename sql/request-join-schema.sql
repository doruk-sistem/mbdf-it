-- Join Request schema for MBDF rooms

-- 1) Join request table
create table if not exists public.join_request (
  request_id uuid primary key default gen_random_uuid(),
  mbdf_room_id uuid references public.mbdf_room(mbdf_room_id) on delete cascade,
  company_id uuid references public.company(company_id) on delete cascade,
  requested_by uuid references public.profiles(id) on delete set null,
  message text,
  accept_terms boolean default false,
  status text check (status in ('pending','approved','rejected','cancelled')) default 'pending',
  decision_by uuid references public.profiles(id),
  decision_note text,
  created_at timestamptz default now(),
  decided_at timestamptz
);

-- only one pending per (room, company)
create unique index if not exists uq_join_req_pending
  on public.join_request(mbdf_room_id, company_id)
  where status = 'pending';


