-- Fix unarchive_room function to check room admin instead of global admin
CREATE OR REPLACE FUNCTION unarchive_room(
  p_room_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_room_name text;
  v_before_data jsonb;
  v_after_data jsonb;
  v_result jsonb;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Check if user is admin of the room (only room admins can unarchive)
  IF NOT EXISTS (
    SELECT 1 FROM public.mbdf_member 
    WHERE room_id = p_room_id 
    AND user_id = v_user_id 
    AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: Room admin role required';
  END IF;

  -- Get room data for audit
  SELECT 
    name,
    jsonb_build_object(
      'status', status,
      'archived_at', archived_at,
      'archive_reason', archive_reason,
      'archive_initiated_by', archive_initiated_by
    )
  INTO v_room_name, v_before_data
  FROM public.mbdf_room 
  WHERE id = p_room_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Room not found';
  END IF;

  -- Check if room is archived
  IF (v_before_data::jsonb ->> 'status') != 'archived' THEN
    RAISE EXCEPTION 'Room is not archived';
  END IF;

  -- Start transaction
  BEGIN
    -- Unarchive the room
    UPDATE public.mbdf_room 
    SET 
      status = 'active',
      archived_at = NULL,
      archive_reason = NULL,
      archive_initiated_by = NULL,
      updated_at = now()
    WHERE id = p_room_id;

    -- Create audit log entry
    v_after_data := jsonb_build_object(
      'status', 'active',
      'archived_at', NULL,
      'archive_reason', NULL,
      'archive_initiated_by', NULL
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
      'unarchive_room',
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
      'unarchived_at', now()
    );

    RETURN v_result;
  END;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to unarchive room: %', SQLERRM;
END;
$$;