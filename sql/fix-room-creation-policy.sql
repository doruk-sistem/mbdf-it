-- Fix for room creation RLS policy issue
-- This updates the mbdf_room insert policy to use auth.uid() directly
-- instead of the current_user_id() function which was causing issues

-- Drop the existing room creation policy
DROP POLICY IF EXISTS "Authenticated users can create rooms" ON public.mbdf_room;

-- Create the updated policy using auth.uid() directly
CREATE POLICY "Authenticated users can create rooms" ON public.mbdf_room
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND created_by = auth.uid());

-- Also update the current_user_id() function to use security definer
-- to ensure it has proper access to auth.uid()
CREATE OR REPLACE FUNCTION public.current_user_id() RETURNS uuid AS $$
  SELECT auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;
