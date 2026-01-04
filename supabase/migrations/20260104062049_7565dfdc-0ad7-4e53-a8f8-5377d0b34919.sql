-- Add phone_number column to profiles table for contact functionality
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_number text;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_phone_number ON public.profiles(phone_number) WHERE phone_number IS NOT NULL;