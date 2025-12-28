-- Add purchaser email to class_purchases for sending join links
ALTER TABLE public.class_purchases 
ADD COLUMN IF NOT EXISTS purchaser_email text;

-- Add index for email lookups
CREATE INDEX IF NOT EXISTS idx_class_purchases_email ON public.class_purchases(purchaser_email);