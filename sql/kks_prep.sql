-- KKS preparation and submission functions

-- Function to create KKS submission
create or replace function public.create_kks_submission(
  p_room_id uuid,
  p_title text,
  p_description text,
  p_submission_data jsonb
)
returns uuid as $$
declare
  submission_id uuid;
begin
  insert into public.kks_submission (
    room_id, title, description, submission_data, created_by
  ) values (
    p_room_id, p_title, p_description, p_submission_data, public.current_user_id()
  ) returning id into submission_id;
  
  -- Log the creation
  insert into public.audit_log (
    room_id, user_id, action, resource_type, resource_id, new_values
  ) values (
    p_room_id,
    public.current_user_id(),
    'kks_submission_created',
    'kks_submission',
    submission_id,
    jsonb_build_object(
      'title', p_title,
      'data_keys', jsonb_object_keys(p_submission_data)
    )
  );
  
  return submission_id;
end;
$$ language plpgsql security definer;

-- Function to generate KKS evidence files
create or replace function public.generate_kks_evidence(
  p_submission_id uuid,
  p_csv_path text,
  p_pdf_path text,
  p_csv_hash text default null,
  p_pdf_hash text default null
)
returns boolean as $$
begin
  -- Insert CSV evidence
  insert into public.kks_evidence (
    submission_id, file_type, file_path, file_hash
  ) values (
    p_submission_id, 'csv', p_csv_path, p_csv_hash
  );
  
  -- Insert PDF evidence
  insert into public.kks_evidence (
    submission_id, file_type, file_path, file_hash
  ) values (
    p_submission_id, 'pdf', p_pdf_path, p_pdf_hash
  );
  
  -- Update submission status
  update public.kks_submission
  set 
    status = 'submitted',
    submitted_at = now()
  where id = p_submission_id;
  
  -- Log evidence generation
  insert into public.audit_log (
    room_id, user_id, action, resource_type, resource_id, metadata
  ) values (
    (select room_id from public.kks_submission where id = p_submission_id),
    public.current_user_id(),
    'kks_evidence_generated',
    'kks_submission',
    p_submission_id,
    jsonb_build_object(
      'csv_path', p_csv_path,
      'pdf_path', p_pdf_path,
      'generated_at', now()
    )
  );
  
  return true;
exception
  when others then
    return false;
end;
$$ language plpgsql security definer;

-- Function to mark KKS as sent to authority
create or replace function public.mark_kks_sent(
  p_submission_id uuid,
  p_response_data jsonb default null
)
returns boolean as $$
begin
  update public.kks_submission
  set 
    status = 'sent',
    sent_at = now()
  where id = p_submission_id;
  
  -- Log the sending
  insert into public.audit_log (
    room_id, user_id, action, resource_type, resource_id, metadata
  ) values (
    (select room_id from public.kks_submission where id = p_submission_id),
    public.current_user_id(),
    'kks_sent',
    'kks_submission',
    p_submission_id,
    jsonb_build_object(
      'sent_at', now(),
      'response_data', p_response_data
    )
  );
  
  return true;
exception
  when others then
    return false;
end;
$$ language plpgsql security definer;

-- Function to get KKS submission data for CSV generation
create or replace function public.get_kks_csv_data(p_submission_id uuid)
returns jsonb as $$
declare
  submission_data jsonb;
  room_data jsonb;
  members_data jsonb;
begin
  -- Get submission data
  select 
    jsonb_build_object(
      'id', ks.id,
      'title', ks.title,
      'description', ks.description,
      'status', ks.status,
      'submission_data', ks.submission_data,
      'created_at', ks.created_at,
      'submitted_at', ks.submitted_at,
      'room', jsonb_build_object(
        'id', mr.id,
        'name', mr.name,
        'description', mr.description,
        'substance', jsonb_build_object(
          'name', s.name,
          'ec_number', s.ec_number,
          'cas_number', s.cas_number
        )
      )
    ) into submission_data
  from public.kks_submission ks
  inner join public.mbdf_room mr on ks.room_id = mr.id
  inner join public.substance s on mr.substance_id = s.id
  where ks.id = p_submission_id;
  
  -- Get members data
  select jsonb_agg(
    jsonb_build_object(
      'user_id', mm.user_id,
      'role', mm.role,
      'joined_at', mm.joined_at,
      'profile', jsonb_build_object(
        'full_name', p.full_name,
        'email', p.email,
        'company', jsonb_build_object(
          'name', c.name,
          'vat_number', c.vat_number
        )
      )
    )
  ) into members_data
  from public.mbdf_member mm
  inner join public.profiles p on mm.user_id = p.id
  left join public.company c on p.company_id = c.id
  where mm.room_id = (select room_id from public.kks_submission where id = p_submission_id);
  
  -- Combine all data
  return submission_data || jsonb_build_object('members', members_data);
end;
$$ language plpgsql stable;

-- Function to calculate file hash (for integrity)
create or replace function public.calculate_file_hash(file_content text)
returns text as $$
  select encode(digest(file_content, 'sha256'), 'hex')
$$ language sql immutable;