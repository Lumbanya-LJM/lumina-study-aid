-- =========================
-- MEETINGS (your "Session")
-- =========================
CREATE TABLE IF NOT EXISTS public.meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NULL REFERENCES public.live_classes(id) ON DELETE SET NULL,
  created_by uuid NULL,
  title text NULL,
  daily_room_name text NULL,
  daily_room_url text NULL,
  daily_meeting_token text NULL,
  status text NOT NULL DEFAULT 'live',
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meetings_class_id ON public.meetings(class_id);
CREATE INDEX IF NOT EXISTS idx_meetings_status ON public.meetings(status);

-- Enable RLS
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

-- RLS policies for meetings
CREATE POLICY "Users can view meetings they created or participated in"
  ON public.meetings FOR SELECT
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM class_participants cp
      WHERE cp.class_id = meetings.class_id AND cp.user_id = auth.uid()
    ) OR
    has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Tutors and admins can create meetings"
  ON public.meetings FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'moderator'::app_role)
  );

CREATE POLICY "Creators can update their meetings"
  ON public.meetings FOR UPDATE
  USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- =========================
-- TRANSCRIPT LINES (context)
-- =========================
CREATE TABLE IF NOT EXISTS public.transcript_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  speaker_name text NOT NULL,
  text text NOT NULL,
  source text NOT NULL DEFAULT 'daily',
  ts timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transcript_lines_meeting_ts
  ON public.transcript_lines(meeting_id, ts ASC);

-- Enable RLS
ALTER TABLE public.transcript_lines ENABLE ROW LEVEL SECURITY;

-- RLS policies for transcript_lines
CREATE POLICY "Meeting participants can view transcripts"
  ON public.transcript_lines FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM meetings m
      WHERE m.id = transcript_lines.meeting_id
      AND (
        m.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM class_participants cp
          WHERE cp.class_id = m.class_id AND cp.user_id = auth.uid()
        )
      )
    ) OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Service role can insert transcripts"
  ON public.transcript_lines FOR INSERT
  WITH CHECK (true);

-- =========================
-- ASSISTANT QUERIES
-- =========================
CREATE TABLE IF NOT EXISTS public.assistant_queries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  user_id uuid NULL,
  kind text NOT NULL,
  query text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assistant_queries_meeting_created
  ON public.assistant_queries(meeting_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.assistant_queries ENABLE ROW LEVEL SECURITY;

-- RLS policies for assistant_queries
CREATE POLICY "Users can view their own queries"
  ON public.assistant_queries FOR SELECT
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can create queries"
  ON public.assistant_queries FOR INSERT
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- =========================
-- ASSISTANT OUTPUTS (cached)
-- =========================
CREATE TABLE IF NOT EXISTS public.assistant_outputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  query_id uuid NULL REFERENCES public.assistant_queries(id) ON DELETE SET NULL,
  kind text NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assistant_outputs_meeting_kind_created
  ON public.assistant_outputs(meeting_id, kind, created_at DESC);

-- Enable RLS
ALTER TABLE public.assistant_outputs ENABLE ROW LEVEL SECURITY;

-- RLS policies for assistant_outputs
CREATE POLICY "Meeting participants can view outputs"
  ON public.assistant_outputs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM meetings m
      WHERE m.id = assistant_outputs.meeting_id
      AND (
        m.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM class_participants cp
          WHERE cp.class_id = m.class_id AND cp.user_id = auth.uid()
        )
      )
    ) OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Service role can insert outputs"
  ON public.assistant_outputs FOR INSERT
  WITH CHECK (true);