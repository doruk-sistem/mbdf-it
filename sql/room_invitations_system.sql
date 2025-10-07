-- Room Invitations System Migration
-- This creates a complete invitation system with token-based acceptance

-- Create invitation_status enum if it doesn't exist
DO $$ BEGIN
  CREATE TYPE public.invitation_status AS ENUM ('pending', 'accepted', 'rejected', 'expired');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create room_invitations table
CREATE TABLE IF NOT EXISTS public.room_invitations (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  room_id uuid NOT NULL,
  email text NOT NULL,
  token text NOT NULL,
  invited_by uuid NOT NULL,
  status public.invitation_status NULL DEFAULT 'pending'::invitation_status,
  message text NULL,
  expires_at timestamp with time zone NOT NULL,
  accepted_at timestamp with time zone NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT room_invitations_pkey PRIMARY KEY (id),
  CONSTRAINT room_invitations_token_key UNIQUE (token),
  CONSTRAINT room_invitations_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES profiles (id) ON DELETE CASCADE,
  CONSTRAINT room_invitations_room_id_fkey FOREIGN KEY (room_id) REFERENCES mbdf_room (id) ON DELETE CASCADE
) TABLESPACE pg_default;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_room_invitations_token ON public.room_invitations USING btree (token) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_room_invitations_email ON public.room_invitations USING btree (email) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_room_invitations_room_id ON public.room_invitations USING btree (room_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_room_invitations_status ON public.room_invitations USING btree (status) TABLESPACE pg_default;

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION update_room_invitations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS update_room_invitations_timestamp ON public.room_invitations;
CREATE TRIGGER update_room_invitations_timestamp 
  BEFORE UPDATE ON room_invitations 
  FOR EACH ROW
  EXECUTE FUNCTION update_room_invitations_updated_at();

-- RLS Policies
ALTER TABLE public.room_invitations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view invitations sent to their email
DROP POLICY IF EXISTS "Users can view their own invitations" ON public.room_invitations;
CREATE POLICY "Users can view their own invitations"
  ON public.room_invitations
  FOR SELECT
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR invited_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM mbdf_member 
      WHERE room_id = room_invitations.room_id 
      AND user_id = auth.uid() 
      AND role IN ('admin', 'lr')
    )
  );

-- Policy: Room members can create invitations
DROP POLICY IF EXISTS "Room members can create invitations" ON public.room_invitations;
CREATE POLICY "Room members can create invitations"
  ON public.room_invitations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM mbdf_member 
      WHERE room_id = room_invitations.room_id 
      AND user_id = auth.uid()
    )
  );

-- Policy: Users can update invitations sent to their email (for accepting/rejecting)
DROP POLICY IF EXISTS "Users can update their own invitations" ON public.room_invitations;
CREATE POLICY "Users can update their own invitations"
  ON public.room_invitations
  FOR UPDATE
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR invited_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM mbdf_member 
      WHERE room_id = room_invitations.room_id 
      AND user_id = auth.uid() 
      AND role IN ('admin', 'lr')
    )
  );

-- Policy: Admins and LR can delete invitations
DROP POLICY IF EXISTS "Admins and LR can delete invitations" ON public.room_invitations;
CREATE POLICY "Admins and LR can delete invitations"
  ON public.room_invitations
  FOR DELETE
  USING (
    invited_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM mbdf_member 
      WHERE room_id = room_invitations.room_id 
      AND user_id = auth.uid() 
      AND role IN ('admin', 'lr')
    )
  );

-- Create a view for pending invitations
CREATE OR REPLACE VIEW pending_room_invitations AS
SELECT 
  ri.*,
  mr.name as room_name,
  p.full_name as inviter_name,
  p.email as inviter_email
FROM room_invitations ri
JOIN mbdf_room mr ON ri.room_id = mr.id
JOIN profiles p ON ri.invited_by = p.id
WHERE ri.status = 'pending' 
  AND ri.expires_at > now();

-- Grant permissions on view
GRANT SELECT ON pending_room_invitations TO authenticated;

-- Add audit log entry for accepted invitations
CREATE OR REPLACE FUNCTION log_invitation_acceptance()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    INSERT INTO audit_log (
      room_id,
      user_id,
      action,
      resource_type,
      resource_id,
      old_values,
      new_values
    ) VALUES (
      NEW.room_id,
      (SELECT id FROM auth.users WHERE email = NEW.email),
      'invitation_accepted',
      'room_invitation',
      NEW.id,
      jsonb_build_object('status', OLD.status),
      jsonb_build_object('status', NEW.status, 'accepted_at', NEW.accepted_at)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for logging
DROP TRIGGER IF EXISTS log_invitation_acceptance_trigger ON public.room_invitations;
CREATE TRIGGER log_invitation_acceptance_trigger
  AFTER UPDATE ON room_invitations
  FOR EACH ROW
  EXECUTE FUNCTION log_invitation_acceptance();

-- Comment on table and columns
COMMENT ON TABLE public.room_invitations IS 'Stores room invitations with token-based acceptance system';
COMMENT ON COLUMN public.room_invitations.token IS 'Unique token for accepting invitation';
COMMENT ON COLUMN public.room_invitations.expires_at IS 'Invitation expiration date (default 7 days)';
COMMENT ON COLUMN public.room_invitations.status IS 'Invitation status: pending, accepted, rejected, or expired';

