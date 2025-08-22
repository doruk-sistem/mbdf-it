-- Enable Row Level Security (RLS) on all tables
alter table public.company enable row level security;
alter table public.profiles enable row level security;
alter table public.substance enable row level security;
alter table public.mbdf_room enable row level security;
alter table public.mbdf_member enable row level security;
alter table public.lr_candidate enable row level security;
alter table public.lr_vote enable row level security;
alter table public.access_package enable row level security;
alter table public.access_request enable row level security;
alter table public.document enable row level security;
alter table public.message enable row level security;
alter table public.audit_log enable row level security;
alter table public.agreement enable row level security;
alter table public.agreement_party enable row level security;
alter table public.agreement_signature enable row level security;
alter table public.kep_notification enable row level security;
alter table public.kks_submission enable row level security;
alter table public.kks_evidence enable row level security;

-- Helper functions
create or replace function auth.user_id() returns uuid as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$ language sql stable;

create or replace function public.current_user_id() returns uuid as $$
  select auth.user_id()
$$ language sql stable;

create or replace function public.is_member_of_room(room_uuid uuid) returns boolean as $$
  select exists (
    select 1 from public.mbdf_member
    where room_id = room_uuid and user_id = public.current_user_id()
  )
$$ language sql stable;

create or replace function public.is_lr_of_room(room_uuid uuid) returns boolean as $$
  select exists (
    select 1 from public.mbdf_member
    where room_id = room_uuid 
    and user_id = public.current_user_id() 
    and role in ('lr', 'admin')
  )
$$ language sql stable;

create or replace function public.is_admin_of_room(room_uuid uuid) returns boolean as $$
  select exists (
    select 1 from public.mbdf_member
    where room_id = room_uuid 
    and user_id = public.current_user_id() 
    and role = 'admin'
  )
$$ language sql stable;

-- Company policies
create policy "Users can view their own company" on public.company
  for select using (
    id in (select company_id from public.profiles where id = public.current_user_id())
  );

create policy "Authenticated users can create companies" on public.company
  for insert with check (auth.role() = 'authenticated');

create policy "Users can update their own company" on public.company
  for update using (
    id in (select company_id from public.profiles where id = public.current_user_id())
  );

-- Profiles policies
create policy "Users can view profiles in same rooms" on public.profiles
  for select using (
    id = public.current_user_id() or
    exists (
      select 1 from public.mbdf_member m1
      inner join public.mbdf_member m2 on m1.room_id = m2.room_id
      where m1.user_id = public.current_user_id() and m2.user_id = public.profiles.id
    )
  );

create policy "Users can update their own profile" on public.profiles
  for update using (id = public.current_user_id());

create policy "Users can insert their own profile" on public.profiles
  for insert with check (id = public.current_user_id());

-- Substance policies (read-only for now)
create policy "Members can view substances" on public.substance
  for select using (auth.role() = 'authenticated');

-- MBDF Room policies
create policy "Members can view rooms they belong to" on public.mbdf_room
  for select using (public.is_member_of_room(id));

create policy "Authenticated users can create rooms" on public.mbdf_room
  for insert with check (auth.role() = 'authenticated' and created_by = public.current_user_id());

create policy "LR/Admin can update rooms" on public.mbdf_room
  for update using (public.is_lr_of_room(id));

-- MBDF Member policies
create policy "Members can view room memberships" on public.mbdf_member
  for select using (public.is_member_of_room(room_id));

create policy "LR/Admin can manage memberships" on public.mbdf_member
  for all using (public.is_lr_of_room(room_id));

create policy "Users can join rooms" on public.mbdf_member
  for insert with check (user_id = public.current_user_id());

-- LR Candidate policies
create policy "Members can view LR candidates" on public.lr_candidate
  for select using (public.is_member_of_room(room_id));

create policy "Members can nominate candidates" on public.lr_candidate
  for insert with check (public.is_member_of_room(room_id));

create policy "Admin can update selections" on public.lr_candidate
  for update using (public.is_admin_of_room(room_id));

-- LR Vote policies
create policy "Voters can view their own votes" on public.lr_vote
  for select using (voter_id = public.current_user_id() and public.is_member_of_room(room_id));

create policy "Members can cast votes" on public.lr_vote
  for insert with check (voter_id = public.current_user_id() and public.is_member_of_room(room_id));

create policy "Voters can update their votes" on public.lr_vote
  for update using (voter_id = public.current_user_id() and public.is_member_of_room(room_id));

-- Access Package policies
create policy "Members can view packages" on public.access_package
  for select using (public.is_member_of_room(room_id));

create policy "LR/Admin can manage packages" on public.access_package
  for all using (public.is_lr_of_room(room_id));

-- Access Request policies
create policy "Users can view requests they made or can approve" on public.access_request
  for select using (
    requester_id = public.current_user_id() or
    exists (
      select 1 from public.access_package ap
      where ap.id = public.access_request.package_id and public.is_lr_of_room(ap.room_id)
    )
  );

create policy "Members can create requests" on public.access_request
  for insert with check (
    requester_id = public.current_user_id() and
    exists (
      select 1 from public.access_package ap
      where ap.id = public.access_request.package_id and public.is_member_of_room(ap.room_id)
    )
  );

create policy "LR/Admin can update requests" on public.access_request
  for update using (
    exists (
      select 1 from public.access_package ap
      where ap.id = public.access_request.package_id and public.is_lr_of_room(ap.room_id)
    )
  );

-- Document policies
create policy "Members can view documents" on public.document
  for select using (public.is_member_of_room(room_id));

create policy "Members can upload documents" on public.document
  for insert with check (
    uploaded_by = public.current_user_id() and public.is_member_of_room(room_id)
  );

create policy "Uploaders can update their documents" on public.document
  for update using (
    uploaded_by = public.current_user_id() and public.is_member_of_room(room_id)
  );

-- Message policies
create policy "Members can view messages" on public.message
  for select using (public.is_member_of_room(room_id));

create policy "Members can send messages" on public.message
  for insert with check (
    sender_id = public.current_user_id() and public.is_member_of_room(room_id)
  );

-- Audit log policies
create policy "LR/Admin can view audit logs" on public.audit_log
  for select using (public.is_lr_of_room(room_id));

-- Agreement policies
create policy "Members can view agreements" on public.agreement
  for select using (public.is_member_of_room(room_id));

create policy "LR/Admin can manage agreements" on public.agreement
  for all using (public.is_lr_of_room(room_id));

-- Agreement party policies
create policy "Parties can view their participation" on public.agreement_party
  for select using (
    user_id = public.current_user_id() or
    exists (
      select 1 from public.agreement a
      where a.id = public.agreement_party.agreement_id and public.is_lr_of_room(a.room_id)
    )
  );

create policy "LR/Admin can manage parties" on public.agreement_party
  for all using (
    exists (
      select 1 from public.agreement a
      where a.id = public.agreement_party.agreement_id and public.is_lr_of_room(a.room_id)
    )
  );

-- Agreement signature policies
create policy "Signers can view their signatures" on public.agreement_signature
  for select using (
    exists (
      select 1 from public.agreement_party ap
      where ap.id = public.agreement_signature.party_id and ap.user_id = public.current_user_id()
    ) or
    exists (
      select 1 from public.agreement a
      where a.id = public.agreement_signature.agreement_id and public.is_lr_of_room(a.room_id)
    )
  );

create policy "System can manage signatures" on public.agreement_signature
  for all using (true);

-- KEP notification policies
create policy "Recipients and LR can view KEP notifications" on public.kep_notification
  for select using (
    recipient_id = public.current_user_id() or
    exists (
      select 1 from public.agreement a
      where a.id = public.kep_notification.agreement_id and public.is_lr_of_room(a.room_id)
    )
  );

create policy "System can manage KEP notifications" on public.kep_notification
  for all using (true);

-- KKS submission policies
create policy "Members can view KKS submissions" on public.kks_submission
  for select using (public.is_member_of_room(room_id));

create policy "LR/Admin can manage KKS submissions" on public.kks_submission
  for all using (public.is_lr_of_room(room_id));

-- KKS evidence policies
create policy "Members can view KKS evidence" on public.kks_evidence
  for select using (
    exists (
      select 1 from public.kks_submission ks
      where ks.id = public.kks_evidence.submission_id and public.is_member_of_room(ks.room_id)
    )
  );

create policy "System can manage KKS evidence" on public.kks_evidence
  for all using (true);