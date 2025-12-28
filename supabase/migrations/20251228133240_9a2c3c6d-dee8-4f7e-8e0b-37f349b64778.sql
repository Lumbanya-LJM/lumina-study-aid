-- Create table for individual class/recording purchases
CREATE TABLE public.class_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  class_id uuid NOT NULL REFERENCES public.live_classes(id) ON DELETE CASCADE,
  purchase_type text NOT NULL DEFAULT 'recording' CHECK (purchase_type IN ('live', 'recording')),
  amount numeric NOT NULL,
  payment_id uuid REFERENCES public.payments(id),
  purchased_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, class_id)
);

-- Enable RLS
ALTER TABLE public.class_purchases ENABLE ROW LEVEL SECURITY;

-- Users can view their own purchases
CREATE POLICY "Users can view their own purchases"
ON public.class_purchases
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create purchases (via payment flow)
CREATE POLICY "Users can create their own purchases"
ON public.class_purchases
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can manage all purchases
CREATE POLICY "Admins can manage all purchases"
ON public.class_purchases
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Add per-class pricing columns to live_classes
ALTER TABLE public.live_classes 
ADD COLUMN IF NOT EXISTS live_class_price numeric DEFAULT 50,
ADD COLUMN IF NOT EXISTS recording_price numeric DEFAULT 30,
ADD COLUMN IF NOT EXISTS is_purchasable boolean DEFAULT true;

-- Update live_classes RLS to allow viewing purchasable classes
DROP POLICY IF EXISTS "Enrolled users can view classes" ON public.live_classes;

CREATE POLICY "Users can view accessible classes"
ON public.live_classes
FOR SELECT
USING (
  (auth.uid() = host_id) 
  OR has_role(auth.uid(), 'admin') 
  OR (EXISTS (
    SELECT 1 FROM academy_enrollments
    WHERE academy_enrollments.course_id = live_classes.course_id
    AND academy_enrollments.user_id = auth.uid()
    AND academy_enrollments.status = 'active'
  ))
  OR (is_purchasable = true)
  OR (EXISTS (
    SELECT 1 FROM class_purchases
    WHERE class_purchases.class_id = live_classes.id
    AND class_purchases.user_id = auth.uid()
  ))
);

-- Update stream-recording function access check (via RLS on class_purchases)