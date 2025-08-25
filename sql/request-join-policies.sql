-- RLS policies for join_request

alter table public.join_request enable row level security;

-- SELECT: requester sees own; LR of room or admin sees all for that room
create policy if not exists jr_select_self on public.join_request
  for select using (
    requested_by = auth.uid()
    or exists (
      select 1
      from public.mbdf_member m
      join public.profiles p on p.company_id = m.company_id and p.id = auth.uid()
      where m.mbdf_room_id = join_request.mbdf_room_id
        and m.role in ('lr','lr_candidate')
    )
    or (select role from public.profiles where id = auth.uid()) = 'admin'
  );

-- INSERT: signed-in, has company, not already a member of the room
create policy if not exists jr_insert_auth on public.join_request
  for insert with check (
    auth.uid() is not null
    and exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.company_id = join_request.company_id)
    and not exists (
      select 1 from public.mbdf_member mm
      where mm.mbdf_room_id = join_request.mbdf_room_id
        and mm.company_id = join_request.company_id
    )
  );

-- UPDATE: only LR of the room or admin (for decision fields/status)
create policy if not exists jr_update_lr on public.join_request
  for update using (
    (select role from public.profiles where id = auth.uid()) = 'admin' or
    exists (
      select 1
      from public.mbdf_member m
      join public.profiles p on p.company_id = m.company_id and p.id = auth.uid()
      where m.mbdf_room_id = join_request.mbdf_room_id
        and m.role in ('lr','lr_candidate')
    )
  );

-- DELETE (optional): requester can cancel while pending
create policy if not exists jr_delete_self on public.join_request
  for delete using (requested_by = auth.uid() and status = 'pending');


