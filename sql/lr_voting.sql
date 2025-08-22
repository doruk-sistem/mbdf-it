-- LR Voting specific functions and triggers

-- Function to calculate total score for a candidate
create or replace function public.calculate_candidate_score(candidate_uuid uuid)
returns numeric as $$
  select coalesce(
    avg(
      coalesce(technical_score, 0) + 
      coalesce(experience_score, 0) + 
      coalesce(availability_score, 0) + 
      coalesce(communication_score, 0) + 
      coalesce(leadership_score, 0)
    ), 0
  )
  from public.lr_vote
  where candidate_id = candidate_uuid
$$ language sql stable;

-- Function to get voting results for a room
create or replace function public.get_voting_results(room_uuid uuid)
returns table (
  candidate_id uuid,
  user_id uuid,
  full_name text,
  total_score numeric,
  vote_count bigint
) as $$
  select 
    lc.id as candidate_id,
    lc.user_id,
    p.full_name,
    public.calculate_candidate_score(lc.id) as total_score,
    count(lv.id) as vote_count
  from public.lr_candidate lc
  left join public.profiles p on lc.user_id = p.id
  left join public.lr_vote lv on lc.id = lv.candidate_id
  where lc.room_id = room_uuid
  group by lc.id, lc.user_id, p.full_name
  order by total_score desc, vote_count desc
$$ language sql stable;

-- Function to finalize LR selection (only one can be selected)
create or replace function public.finalize_lr_selection(room_uuid uuid, selected_candidate_uuid uuid)
returns boolean as $$
begin
  -- First, unselect all candidates in the room
  update public.lr_candidate
  set is_selected = false
  where room_id = room_uuid;
  
  -- Then select the chosen candidate
  update public.lr_candidate
  set is_selected = true
  where room_id = room_uuid and id = selected_candidate_uuid;
  
  -- Log the selection
  insert into public.audit_log (
    room_id, user_id, action, resource_type, resource_id, metadata
  ) values (
    room_uuid,
    public.current_user_id(),
    'lr_selected',
    'lr_candidate',
    selected_candidate_uuid,
    jsonb_build_object('total_score', public.calculate_candidate_score(selected_candidate_uuid))
  );
  
  return true;
exception
  when others then
    return false;
end;
$$ language plpgsql security definer;

-- Function to check if voting is complete (all members have voted)
create or replace function public.is_voting_complete(room_uuid uuid)
returns boolean as $$
  select (
    select count(*) from public.mbdf_member where room_id = room_uuid
  ) = (
    select count(distinct voter_id) from public.lr_vote lv
    inner join public.lr_candidate lc on lv.candidate_id = lc.id
    where lc.room_id = room_uuid
  )
$$ language sql stable;

-- Trigger to update vote timestamp
create or replace function public.update_vote_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trigger_update_vote_timestamp on public.lr_vote;
create trigger trigger_update_vote_timestamp
  before update on public.lr_vote
  for each row execute function public.update_vote_timestamp();