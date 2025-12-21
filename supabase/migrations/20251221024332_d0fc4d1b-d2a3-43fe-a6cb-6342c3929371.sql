-- Add tutor-specific fields to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS bio text,
ADD COLUMN IF NOT EXISTS qualifications text,
ADD COLUMN IF NOT EXISTS subjects text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS experience text;