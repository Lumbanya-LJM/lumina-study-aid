-- Add Daily recording id so we can mint fresh access links when users watch
ALTER TABLE public.live_classes
ADD COLUMN IF NOT EXISTS recording_id TEXT;

CREATE INDEX IF NOT EXISTS idx_live_classes_recording_id ON public.live_classes(recording_id);
