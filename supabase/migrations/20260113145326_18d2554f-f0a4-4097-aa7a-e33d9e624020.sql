-- Fix overly permissive RLS policies by restricting INSERT to service role context
-- Drop and recreate with proper restrictions

-- Fix transcript_lines INSERT policy
DROP POLICY IF EXISTS "Service role can insert transcripts" ON public.transcript_lines;
CREATE POLICY "Tutors and admins can insert transcripts"
  ON public.transcript_lines FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'moderator'::app_role) OR
    EXISTS (
      SELECT 1 FROM meetings m
      WHERE m.id = transcript_lines.meeting_id
      AND m.created_by = auth.uid()
    )
  );

-- Fix assistant_outputs INSERT policy  
DROP POLICY IF EXISTS "Service role can insert outputs" ON public.assistant_outputs;
CREATE POLICY "Authenticated users can insert outputs for their meetings"
  ON public.assistant_outputs FOR INSERT
  WITH CHECK (
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

-- Fix assistant_queries INSERT policy to be more restrictive
DROP POLICY IF EXISTS "Users can create queries" ON public.assistant_queries;
CREATE POLICY "Meeting participants can create queries"
  ON public.assistant_queries FOR INSERT
  WITH CHECK (
    (user_id = auth.uid() OR user_id IS NULL) AND
    EXISTS (
      SELECT 1 FROM meetings m
      WHERE m.id = assistant_queries.meeting_id
      AND (
        m.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM class_participants cp
          WHERE cp.class_id = m.class_id AND cp.user_id = auth.uid()
        )
      )
    )
  );