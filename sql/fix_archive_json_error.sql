-- Fix archive_room function JSON syntax error
CREATE OR REPLACE FUNCTION archive_room(
  p_room_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_room_name text;
  v_room_status text;
  v_pending_count int;
  v_approved_count int;
  v_before_data jsonb;
  v_after_data jsonb;
  v_result jsonb;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Check if user is admin or LR of the room
  IF NOT EXISTS (
    SELECT 1 FROM public.mbdf_member 
    WHERE room_id = p_room_id 
    AND user_id = v_user_id 
    AND role IN ('admin', 'lr')
  ) THEN
    RAISE EXCEPTION 'Access denied: Admin or LR role required';
  END IF;

  -- Get room data for audit
  SELECT name, status INTO v_room_name, v_room_status
  FROM public.mbdf_room 
  WHERE id = p_room_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Room not found';
  END IF;

  -- Check if room is already archived
  IF v_room_status = 'archived' THEN
    RAISE EXCEPTION 'Room is already archived';
  END IF;

  -- Build before_data object
  v_before_data := jsonb_build_object(
    'status', v_room_status,
    'archived_at', NULL,
    'archive_reason', NULL,
    'archive_initiated_by', NULL
  );

  -- Get counts of requests that will be affected
  SELECT 
    COUNT(*) FILTER (WHERE ar.status = 'pending'),
    COUNT(*) FILTER (WHERE ar.status = 'approved')
  INTO v_pending_count, v_approved_count
  FROM public.access_request ar
  JOIN public.access_package ap ON ap.id = ar.package_id
  WHERE ap.room_id = p_room_id;

  -- Start transaction
  BEGIN
    -- Archive the room
    UPDATE public.mbdf_room 
    SET 
      status = 'archived',
      archived_at = now(),
      archive_reason = p_reason,
      archive_initiated_by = v_user_id,
      updated_at = now()
    WHERE id = p_room_id;

    -- Reject all pending access requests
    UPDATE public.access_request 
    SET 
      status = 'rejected',
      rejected_reason = 'Room archived',
      updated_at = now()
    WHERE package_id IN (
      SELECT id FROM public.access_package WHERE room_id = p_room_id
    ) AND status = 'pending';

    -- Revoke all approved access requests (nullify tokens)
    UPDATE public.access_request 
    SET 
      status = 'revoked',
      access_token = NULL,
      updated_at = now()
    WHERE package_id IN (
      SELECT id FROM public.access_package WHERE room_id = p_room_id
    ) AND status = 'approved';

    -- Create audit log entry
    v_after_data := jsonb_build_object(
      'status', 'archived',
      'archived_at', now(),
      'archive_reason', p_reason,
      'archive_initiated_by', v_user_id
    );

    INSERT INTO public.audit_log (
      room_id,
      user_id,
      action,
      resource_type,
      resource_id,
      old_values,
      new_values,
      created_at
    ) VALUES (
      p_room_id,
      v_user_id,
      'archive_room',
      'mbdf_room',
      p_room_id,
      v_before_data,
      v_after_data,
      now()
    );

    -- Build result
    v_result := jsonb_build_object(
      'success', true,
      'room_id', p_room_id,
      'room_name', v_room_name,
      'archived_at', now(),
      'archive_reason', p_reason,
      'pending_requests_rejected', v_pending_count,
      'approved_requests_revoked', v_approved_count
    );

    RETURN v_result;
  END;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to archive room: %', SQLERRM;
END;
$$;