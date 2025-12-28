-- Add recurring meeting fields to live_classes
ALTER TABLE public.live_classes
ADD COLUMN is_recurring boolean DEFAULT false,
ADD COLUMN recurrence_day text NULL,
ADD COLUMN recurrence_time time NULL,
ADD COLUMN recurrence_description text NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.live_classes.is_recurring IS 'Whether this class repeats on a schedule';
COMMENT ON COLUMN public.live_classes.recurrence_day IS 'Day of week for recurring classes (e.g., Monday, Tuesday)';
COMMENT ON COLUMN public.live_classes.recurrence_time IS 'Time for recurring classes';
COMMENT ON COLUMN public.live_classes.recurrence_description IS 'Human-readable description like "Every Tuesday at 18:00"';