-- Add tonnage_range column to mbdf_member table
-- This allows each member to have different tonnage ranges for different rooms

alter table public.mbdf_member
add column tonnage_range text;

-- Add comment to explain the column
comment on column public.mbdf_member.tonnage_range is 'Tonnage range for the member in this specific room (e.g., "1-10", "10-100", "100-1000", "1000+")';
