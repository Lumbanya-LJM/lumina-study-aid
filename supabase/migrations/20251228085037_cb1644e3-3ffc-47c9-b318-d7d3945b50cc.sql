-- Create recording watch history table
CREATE TABLE public.recording_watch_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  class_id UUID NOT NULL REFERENCES public.live_classes(id) ON DELETE CASCADE,
  progress_seconds INTEGER NOT NULL DEFAULT 0,
  duration_seconds INTEGER,
  completed BOOLEAN NOT NULL DEFAULT false,
  last_watched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, class_id)
);

-- Enable RLS
ALTER TABLE public.recording_watch_history ENABLE ROW LEVEL SECURITY;

-- Users can view their own watch history
CREATE POLICY "Users can view their own watch history"
ON public.recording_watch_history
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own watch history
CREATE POLICY "Users can insert their own watch history"
ON public.recording_watch_history
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own watch history
CREATE POLICY "Users can update their own watch history"
ON public.recording_watch_history
FOR UPDATE
USING (auth.uid() = user_id);

-- Add index for faster lookups
CREATE INDEX idx_recording_watch_history_user_class ON public.recording_watch_history(user_id, class_id);

-- Enable realtime for watch history updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.recording_watch_history;