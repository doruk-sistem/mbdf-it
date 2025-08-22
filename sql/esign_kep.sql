-- E-Signature and KEP related functions

-- Function to create agreement with parties
create or replace function public.create_agreement_with_parties(
  p_room_id uuid,
  p_title text,
  p_description text,
  p_content text,
  p_agreement_type text default 'general',
  p_party_ids uuid[] default '{}'
)
returns uuid as $$
declare
  agreement_id uuid;
  party_id uuid;
begin
  -- Create the agreement
  insert into public.agreement (
    room_id, title, description, content, agreement_type, created_by
  ) values (
    p_room_id, p_title, p_description, p_content, p_agreement_type, public.current_user_id()
  ) returning id into agreement_id;
  
  -- Add parties
  foreach party_id in array p_party_ids loop
    insert into public.agreement_party (agreement_id, user_id)
    values (agreement_id, party_id);
  end loop;
  
  -- Log the creation
  insert into public.audit_log (
    room_id, user_id, action, resource_type, resource_id, new_values
  ) values (
    p_room_id,
    public.current_user_id(),
    'agreement_created',
    'agreement',
    agreement_id,
    jsonb_build_object(
      'title', p_title,
      'parties_count', array_length(p_party_ids, 1)
    )
  );
  
  return agreement_id;
end;
$$ language plpgsql security definer;

-- Function to sign agreement
create or replace function public.sign_agreement(
  p_agreement_id uuid,
  p_signature_method text default 'electronic',
  p_signature_hash text default null,
  p_signature_data jsonb default null
)
returns boolean as $$
declare
  party_record record;
begin
  -- Get the party record
  select * into party_record
  from public.agreement_party
  where agreement_id = p_agreement_id and user_id = public.current_user_id();
  
  if not found then
    raise exception 'User is not a party to this agreement';
  end if;
  
  if party_record.signature_status = 'signed' then
    raise exception 'Agreement already signed by this user';
  end if;
  
  -- Update party status
  update public.agreement_party
  set 
    signature_status = 'signed',
    signed_at = now(),
    signature_data = p_signature_data
  where id = party_record.id;
  
  -- Create signature record
  insert into public.agreement_signature (
    agreement_id, party_id, signature_method, signature_hash
  ) values (
    p_agreement_id, party_record.id, p_signature_method, p_signature_hash
  );
  
  -- Log the signature
  insert into public.audit_log (
    room_id, user_id, action, resource_type, resource_id, metadata
  ) values (
    (select room_id from public.agreement where id = p_agreement_id),
    public.current_user_id(),
    'agreement_signed',
    'agreement',
    p_agreement_id,
    jsonb_build_object(
      'signature_method', p_signature_method,
      'signed_at', now()
    )
  );
  
  return true;
exception
  when others then
    return false;
end;
$$ language plpgsql security definer;

-- Function to check if agreement is fully signed
create or replace function public.is_agreement_fully_signed(p_agreement_id uuid)
returns boolean as $$
  select not exists (
    select 1 from public.agreement_party
    where agreement_id = p_agreement_id and signature_status != 'signed'
  )
$$ language sql stable;

-- Function to send KEP notification
create or replace function public.send_kep_notification(
  p_agreement_id uuid,
  p_recipient_id uuid,
  p_kep_address text,
  p_subject text,
  p_content text
)
returns uuid as $$
declare
  notification_id uuid;
begin
  insert into public.kep_notification (
    agreement_id, recipient_id, kep_address, subject, content
  ) values (
    p_agreement_id, p_recipient_id, p_kep_address, p_subject, p_content
  ) returning id into notification_id;
  
  -- Log the KEP send
  insert into public.audit_log (
    room_id, user_id, action, resource_type, resource_id, metadata
  ) values (
    (select room_id from public.agreement where id = p_agreement_id),
    public.current_user_id(),
    'kep_sent',
    'kep_notification',
    notification_id,
    jsonb_build_object(
      'agreement_id', p_agreement_id,
      'recipient_id', p_recipient_id,
      'kep_address', p_kep_address
    )
  );
  
  return notification_id;
end;
$$ language plpgsql security definer;

-- Function to update KEP notification status
create or replace function public.update_kep_status(
  p_notification_id uuid,
  p_status text,
  p_provider_response jsonb default null
)
returns boolean as $$
begin
  update public.kep_notification
  set 
    status = p_status,
    provider_response = p_provider_response,
    sent_at = case when p_status = 'sent' then now() else sent_at end
  where id = p_notification_id;
  
  return found;
end;
$$ language plpgsql security definer;