-- Join Requests minimal migration adapted to current schema (user-based membership)

create table if not exists public.join_request (
  request_id uuid primary key default gen_random_uuid(),
  room_id uuid references public.mbdf_room(id) on delete cascade,
  requester_id uuid references public.profiles(id) on delete set null,
  message text,
  accept_terms boolean default false,
  status text check (status in ('pending','approved','rejected','cancelled')) default 'pending',
  decision_by uuid references public.profiles(id),
  decision_note text,
  created_at timestamptz default now(),
  decided_at timestamptz
);

create unique index if not exists uq_join_req_pending
  on public.join_request(room_id, requester_id) where status='pending';

-- Helper function: check if current user is LR/Admin of a room
create or replace function public.is_lr_of_room(p_room uuid)
returns boolean language sql stable as $$
  select exists(
    select 1 from public.mbdf_member mm
    where mm.room_id = p_room and mm.user_id = auth.uid() and mm.role in ('lr','admin')
  );
$$;

-- Public meta RPCs (security definer)
create or replace function public.list_rooms_meta()
returns table(
  room_id uuid,
  substance_name text,
  ec text,
  cas text,
  member_count int,
  lr_selected boolean,
  created_at timestamptz
) language sql stable security definer set search_path=public as $$
  select r.id as room_id,
         s.name as substance_name,
         s.ec_number as ec,
         s.cas_number as cas,
         (select count(*) from public.mbdf_member m where m.room_id = r.id) as member_count,
         exists(select 1 from public.lr_candidate c where c.room_id = r.id and c.is_selected = true) as lr_selected,
         r.created_at
  from public.mbdf_room r
  join public.substance s on s.id = r.substance_id
  order by r.created_at desc;
$$;

create or replace function public.get_room_meta(p_room uuid)
returns table(
  room_id uuid,
  substance_name text,
  ec text,
  cas text,
  member_count int,
  lr_selected boolean,
  created_at timestamptz,
  short_description text
) language sql stable security definer set search_path=public as $$
  select r.id as room_id,
         s.name as substance_name,
         s.ec_number as ec,
         s.cas_number as cas,
         (select count(*) from public.mbdf_member m where m.room_id = r.id) as member_count,
         exists(select 1 from public.lr_candidate c where c.room_id = r.id and c.is_selected = true) as lr_selected,
         r.created_at,
         r.description as short_description
  from public.mbdf_room r
  join public.substance s on s.id = r.substance_id
  where r.id = p_room;
$$;

alter table public.join_request enable row level security;

-- SELECT: requester sees own; LR/Admin sees room’s requests
drop policy if exists jr_select on public.join_request;
create policy jr_select on public.join_request
for select using (
  requester_id = auth.uid()
  or exists(select 1 from public.profiles pr where pr.id = auth.uid() and pr.role = 'admin')
  or public.is_lr_of_room(join_request.room_id)
);

-- INSERT: auth + not already a member of the room
drop policy if exists jr_insert on public.join_request;
create policy jr_insert on public.join_request
for insert with check (
  auth.uid() is not null
  and not exists (
    select 1 from public.mbdf_member mm 
    where mm.room_id = join_request.room_id and mm.user_id = auth.uid()
  )
);

-- UPDATE (approve/reject): LR/Admin only
drop policy if exists jr_update on public.join_request;
create policy jr_update on public.join_request
for update using (
  exists(select 1 from public.profiles pr where pr.id = auth.uid() and pr.role = 'admin')
  or public.is_lr_of_room(join_request.room_id)
);

-- DELETE: requester may cancel if pending
drop policy if exists jr_delete on public.join_request;
create policy jr_delete on public.join_request
for delete using (requester_id = auth.uid() and status = 'pending');


