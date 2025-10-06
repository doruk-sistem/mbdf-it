-- Create table to track user deletion and data transfers
-- This is a normalized approach to avoid adding metadata columns to every table

-- Drop existing table first to recreate with correct constraints
DROP TABLE IF EXISTS public.user_deletion_transfers CASCADE;

CREATE TABLE public.user_deletion_transfers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Deleted user information
  deleted_user_id UUID NOT NULL,
  deleted_user_name TEXT NOT NULL,
  deleted_user_email TEXT NOT NULL,
  deleted_user_company TEXT,
  
  -- Deletion metadata
  deleted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  transferred_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  
  -- Summary of transferred records
  transfer_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Example:
  -- {
  --   "mbdf_rooms": { "count": 5, "ids": ["id1", "id2", ...] },
  --   "documents": { "count": 23, "ids": [...] },
  --   "agreements": { "count": 3, "ids": [...] },
  --   "access_packages": { "count": 2, "ids": [...] },
  --   "kks_submissions": { "count": 8, "ids": [...] }
  -- }
  
  -- Deletion reason (optional)
  deletion_reason TEXT,
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_user_deletion_transfers_deleted_user 
  ON public.user_deletion_transfers(deleted_user_id);

CREATE INDEX IF NOT EXISTS idx_user_deletion_transfers_transferred_to 
  ON public.user_deletion_transfers(transferred_to);

CREATE INDEX IF NOT EXISTS idx_user_deletion_transfers_deleted_at 
  ON public.user_deletion_transfers(deleted_at DESC);

-- Add RLS policies
ALTER TABLE public.user_deletion_transfers ENABLE ROW LEVEL SECURITY;

-- Admin can view all transfers
CREATE POLICY "Admins can view all deletion transfers" 
  ON public.user_deletion_transfers
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Only admins can insert
CREATE POLICY "Admins can insert deletion transfers" 
  ON public.user_deletion_transfers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

COMMENT ON TABLE public.user_deletion_transfers IS 
  'Tracks user deletions and data ownership transfers to maintain audit trail without bloating main tables';

