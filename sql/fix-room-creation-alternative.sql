-- Alternative fix for room creation RLS policy issue
-- This creates a simpler, more permissive policy for room creation

-- First, drop the existing problematic policy
DROP POLICY IF EXISTS "Authenticated users can create rooms" ON public.mbdf_room;

-- Option 1: Simpler policy that only checks authentication
CREATE POLICY "Authenticated users can create rooms" ON public.mbdf_room
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- If that doesn't work, we can try Option 2: Even more permissive (temporary solution)
-- Uncomment the lines below if Option 1 still fails:

-- DROP POLICY IF EXISTS "Authenticated users can create rooms" ON public.mbdf_room;
-- CREATE POLICY "Allow room creation" ON public.mbdf_room
--   FOR INSERT WITH CHECK (true);

-- Debug: Check current policies on the table
-- Run this to see what policies are currently active:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies 
-- WHERE tablename = 'mbdf_room';
