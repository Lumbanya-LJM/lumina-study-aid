-- Add metadata column to payments table to store purchase details for webhook processing
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;