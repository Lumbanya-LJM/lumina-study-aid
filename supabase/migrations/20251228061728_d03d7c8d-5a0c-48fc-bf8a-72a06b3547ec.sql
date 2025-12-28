-- Create focus_sessions table for Focus Mode feature
CREATE TABLE public.focus_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'started',
  settings JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.focus_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own focus sessions"
ON public.focus_sessions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own focus sessions"
ON public.focus_sessions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own focus sessions"
ON public.focus_sessions FOR UPDATE
USING (auth.uid() = user_id);