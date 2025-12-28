-- Add is_archived column to live_classes table
ALTER TABLE public.live_classes 
ADD COLUMN is_archived boolean NOT NULL DEFAULT false;

-- Create index for faster filtering
CREATE INDEX idx_live_classes_archived ON public.live_classes(is_archived);

-- Update RLS policy to include archived filter consideration (hosts can see their archived classes)
-- The existing policies already handle this since hosts can see their own classes