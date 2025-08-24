-- Fix circular dependency in mbdf_member RLS policies
-- and implement read-only access for documents

-- First, fix the mbdf_member policy to avoid circular dependency
DROP POLICY IF EXISTS "Members can view room memberships" ON public.mbdf_member;
DROP POLICY IF EXISTS "Users can view their own memberships" ON public.mbdf_member;
DROP POLICY IF EXISTS "Users can view memberships in accessible rooms" ON public.mbdf_member;

-- Allow users to check their own membership directly
CREATE POLICY "Users can view their own memberships" ON public.mbdf_member
  FOR SELECT USING (user_id = auth.uid());

-- Removed recursive policy to prevent infinite recursion in mbdf_member
-- If needed later, consider using JWT claims or a dedicated view without RLS

-- Update document policies for read-only access for non-members
DROP POLICY IF EXISTS "Members can view documents" ON public.document;
DROP POLICY IF EXISTS "Members can upload documents" ON public.document;
DROP POLICY IF EXISTS "Users can view documents in accessible rooms" ON public.document;

-- Allow anyone who can view the room to view documents (read-only)
CREATE POLICY "Users can view documents in accessible rooms" ON public.document
  FOR SELECT USING (
    public.can_view_room(document.room_id)
  );

-- Only members can upload documents
CREATE POLICY "Members can upload documents" ON public.document
  FOR INSERT WITH CHECK (
    uploaded_by = auth.uid() 
    AND EXISTS (
      SELECT 1 FROM public.mbdf_member m
      WHERE m.room_id = document.room_id 
      AND m.user_id = auth.uid()
    )
  );

-- Update the is_member_of_room function to avoid circular dependency
CREATE OR REPLACE FUNCTION public.is_member_of_room(room_uuid uuid) RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.mbdf_member
    WHERE room_id = room_uuid 
    AND user_id = auth.uid()
    -- Direct check without calling other functions
  )
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Add a new function to check if user can view room (member or creator)
CREATE OR REPLACE FUNCTION public.can_view_room(room_uuid uuid) RETURNS boolean AS $$
  SELECT EXISTS (
    -- User is a member
    SELECT 1 FROM public.mbdf_member
    WHERE room_id = room_uuid AND user_id = auth.uid()
    UNION
    -- User created the room
    SELECT 1 FROM public.mbdf_room
    WHERE id = room_uuid AND created_by = auth.uid()
  )
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ------------------------------------------------------------------
-- Storage policies for docs bucket (allow members to upload/view)
-- ------------------------------------------------------------------

-- Drop old policies if they exist
DROP POLICY IF EXISTS "Docs: members can upload" ON storage.objects;
DROP POLICY IF EXISTS "Docs: can view if can_view_room" ON storage.objects;

-- Allow members to upload into paths prefixed by their roomId
-- Path convention: <roomId>/<filename>
CREATE POLICY "Docs: members can upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'docs'
    AND (
      -- Extract roomId from path prefix and verify membership
      EXISTS (
        SELECT 1 FROM public.mbdf_member m
        WHERE m.user_id = auth.uid()
          AND m.room_id = split_part(name, '/', 1)::uuid
      )
    )
  );

-- Allow users to view objects in rooms they can view
CREATE POLICY "Docs: can view if can_view_room" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'docs'
    AND public.can_view_room(split_part(name, '/', 1)::uuid)
  );
