-- Add forum visit tracking column
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS last_forum_visit timestamp with time zone DEFAULT now();
