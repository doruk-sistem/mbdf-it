-- MBDF Room Archive System Migration
-- This migration adds archive functionality with safe, auditable, and reversible processes

-- 1. Add archive columns to mbdf_room table
ALTER TABLE public.mbdf_room 
ADD COLUMN IF NOT EXISTS archived_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS archive_reason text,
ADD COLUMN IF NOT EXISTS archive_initiated_by uuid references public.profiles(id);

-- 2. Add 'revoked' status to request_status enum (if not exists)
DO $$ BEGIN
    ALTER TYPE request_status ADD VALUE IF NOT EXISTS 'revoked';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Create RLS policies for write-blocking on archived rooms

-- Block INSERTs on archived rooms for documents
DROP POLICY IF EXISTS "documents_insert_not_archived" ON public.document;
CREATE POLICY "documents_insert_not_archived" ON public.document
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.mbdf_room 
    WHERE id = document.room_id 
    AND status != 'archived'
  )
);

-- Block UPDATEs on archived rooms for documents
DROP POLICY IF EXISTS "documents_update_not_archived" ON public.document;
CREATE POLICY "documents_update_not_archived" ON public.document
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.mbdf_room 
    WHERE id = document.room_id 
    AND status != 'archived'
  )
);

-- Block DELETEs on archived rooms for documents
DROP POLICY IF EXISTS "documents_delete_not_archived" ON public.document;
CREATE POLICY "documents_delete_not_archived" ON public.document
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.mbdf_room 
    WHERE id = document.room_id 
    AND status != 'archived'
  )
);

-- Block INSERTs on archived rooms for messages
DROP POLICY IF EXISTS "messages_insert_not_archived" ON public.message;
CREATE POLICY "messages_insert_not_archived" ON public.message
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.mbdf_room 
    WHERE id = message.room_id 
    AND status != 'archived'
  )
);

-- Block UPDATEs on archived rooms for messages
DROP POLICY IF EXISTS "messages_update_not_archived" ON public.message;
CREATE POLICY "messages_update_not_archived" ON public.message
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.mbdf_room 
    WHERE id = message.room_id 
    AND status != 'archived'
  )
);

-- Block INSERTs on archived rooms for access_package
DROP POLICY IF EXISTS "access_package_insert_not_archived" ON public.access_package;
CREATE POLICY "access_package_insert_not_archived" ON public.access_package
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.mbdf_room 
    WHERE id = access_package.room_id 
    AND status != 'archived'
  )
);

-- Block UPDATEs on archived rooms for access_package
DROP POLICY IF EXISTS "access_package_update_not_archived" ON public.access_package;
CREATE POLICY "access_package_update_not_archived" ON public.access_package
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.mbdf_room 
    WHERE id = access_package.room_id 
    AND status != 'archived'
  )
);

-- Block INSERTs/UPDATEs on archived rooms for access_request
DROP POLICY IF EXISTS "access_request_insert_not_archived" ON public.access_request;
CREATE POLICY "access_request_insert_not_archived" ON public.access_request
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.mbdf_room 
    JOIN public.access_package ON access_package.room_id = mbdf_room.id
    WHERE access_package.id = access_request.package_id 
    AND mbdf_room.status != 'archived'
  )
);

DROP POLICY IF EXISTS "access_request_update_not_archived" ON public.access_request;
CREATE POLICY "access_request_update_not_archived" ON public.access_request
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.mbdf_room 
    JOIN public.access_package ON access_package.room_id = mbdf_room.id
    WHERE access_package.id = access_request.package_id 
    AND mbdf_room.status != 'archived'
  )
);

-- Block INSERTs on archived rooms for lr_candidate
DROP POLICY IF EXISTS "lr_candidate_insert_not_archived" ON public.lr_candidate;
CREATE POLICY "lr_candidate_insert_not_archived" ON public.lr_candidate
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.mbdf_room 
    WHERE id = lr_candidate.room_id 
    AND status != 'archived'
  )
);

-- Block UPDATEs on archived rooms for lr_candidate
DROP POLICY IF EXISTS "lr_candidate_update_not_archived" ON public.lr_candidate;
CREATE POLICY "lr_candidate_update_not_archived" ON public.lr_candidate
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.mbdf_room 
    WHERE id = lr_candidate.room_id 
    AND status != 'archived'
  )
);

-- Block INSERTs on archived rooms for lr_vote
DROP POLICY IF EXISTS "lr_vote_insert_not_archived" ON public.lr_vote;
CREATE POLICY "lr_vote_insert_not_archived" ON public.lr_vote
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.mbdf_room 
    WHERE id = lr_vote.room_id 
    AND status != 'archived'
  )
);

-- Block UPDATEs on archived rooms for lr_vote
DROP POLICY IF EXISTS "lr_vote_update_not_archived" ON public.lr_vote;
CREATE POLICY "lr_vote_update_not_archived" ON public.lr_vote
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.mbdf_room 
    WHERE id = lr_vote.room_id 
    AND status != 'archived'
  )
);

-- 4. Create archive_room function
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
  SELECT name, status INTO v_room_name, v_before_data
  FROM public.mbdf_room 
  WHERE id = p_room_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Room not found';
  END IF;

  -- Check if room is already archived
  IF (v_before_data::jsonb ->> 'status') = 'archived' THEN
    RAISE EXCEPTION 'Room is already archived';
  END IF;

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

-- 5. Create unarchive_room function
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

  -- Check if user is admin (only admins can unarchive)
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = v_user_id 
    AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
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

-- 6. Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION archive_room(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION unarchive_room(uuid) TO authenticated;

-- 7. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_mbdf_room_status ON public.mbdf_room(status);
CREATE INDEX IF NOT EXISTS idx_mbdf_room_archived_at ON public.mbdf_room(archived_at);
CREATE INDEX IF NOT EXISTS idx_access_request_status ON public.access_request(status);
CREATE INDEX IF NOT EXISTS idx_audit_log_room_action ON public.audit_log(room_id, action);