-- Create live_classes table for class sessions
CREATE TABLE public.live_classes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID REFERENCES public.academy_courses(id) ON DELETE CASCADE,
  host_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  daily_room_name TEXT,
  daily_room_url TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled',
  scheduled_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  recording_url TEXT,
  recording_duration_seconds INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create class_transcripts table for AI transcription
CREATE TABLE public.class_transcripts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID NOT NULL REFERENCES public.live_classes(id) ON DELETE CASCADE,
  speaker_name TEXT,
  speaker_id TEXT,
  content TEXT NOT NULL,
  timestamp_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create class_participants table for tracking attendance
CREATE TABLE public.class_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID NOT NULL REFERENCES public.live_classes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  left_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER
);

-- Create class_ai_summaries table for Lumina post-class summaries
CREATE TABLE public.class_ai_summaries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID NOT NULL REFERENCES public.live_classes(id) ON DELETE CASCADE,
  summary TEXT NOT NULL,
  key_points JSONB DEFAULT '[]'::jsonb,
  topics_covered JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.live_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_ai_summaries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for live_classes
CREATE POLICY "Tutors can create classes"
  ON public.live_classes FOR INSERT
  WITH CHECK (
    auth.uid() = host_id AND 
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role))
  );

CREATE POLICY "Tutors can manage their classes"
  ON public.live_classes FOR UPDATE
  USING (auth.uid() = host_id);

CREATE POLICY "Tutors can delete their classes"
  ON public.live_classes FOR DELETE
  USING (auth.uid() = host_id);

CREATE POLICY "Enrolled users can view classes"
  ON public.live_classes FOR SELECT
  USING (
    auth.uid() = host_id OR
    has_role(auth.uid(), 'admin'::app_role) OR
    EXISTS (
      SELECT 1 FROM academy_enrollments
      WHERE academy_enrollments.course_id = live_classes.course_id
      AND academy_enrollments.user_id = auth.uid()
      AND academy_enrollments.status = 'active'
    )
  );

-- RLS Policies for class_transcripts
CREATE POLICY "Participants can view transcripts"
  ON public.class_transcripts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM class_participants
      WHERE class_participants.class_id = class_transcripts.class_id
      AND class_participants.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM live_classes
      WHERE live_classes.id = class_transcripts.class_id
      AND live_classes.host_id = auth.uid()
    )
  );

CREATE POLICY "System can insert transcripts"
  ON public.class_transcripts FOR INSERT
  WITH CHECK (true);

-- RLS Policies for class_participants
CREATE POLICY "Users can join classes"
  ON public.class_participants FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their participation"
  ON public.class_participants FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Participants can view class participants"
  ON public.class_participants FOR SELECT
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM live_classes
      WHERE live_classes.id = class_participants.class_id
      AND live_classes.host_id = auth.uid()
    )
  );

-- RLS Policies for class_ai_summaries
CREATE POLICY "Participants can view summaries"
  ON public.class_ai_summaries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM class_participants
      WHERE class_participants.class_id = class_ai_summaries.class_id
      AND class_participants.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM live_classes
      WHERE live_classes.id = class_ai_summaries.class_id
      AND live_classes.host_id = auth.uid()
    )
  );

CREATE POLICY "System can insert summaries"
  ON public.class_ai_summaries FOR INSERT
  WITH CHECK (true);

-- Enable realtime for live_classes
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_classes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.class_transcripts;

-- Create trigger for updated_at
CREATE TRIGGER update_live_classes_updated_at
  BEFORE UPDATE ON public.live_classes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();