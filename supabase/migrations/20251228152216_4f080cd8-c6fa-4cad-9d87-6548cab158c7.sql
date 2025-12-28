-- Drop the existing unique constraint on class_purchases
ALTER TABLE public.class_purchases DROP CONSTRAINT IF EXISTS class_purchases_user_id_class_id_key;

-- Add new unique constraint that includes purchase_type
ALTER TABLE public.class_purchases ADD CONSTRAINT class_purchases_user_class_type_key UNIQUE(user_id, class_id, purchase_type);