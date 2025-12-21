-- Add RLS policies to allow tutors (moderators) to manage their updates
CREATE POLICY "Tutors can create updates"
ON public.tutor_updates
FOR INSERT
WITH CHECK (
  auth.uid() = tutor_id AND 
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role))
);

CREATE POLICY "Tutors can update their updates"
ON public.tutor_updates
FOR UPDATE
USING (auth.uid() = tutor_id)
WITH CHECK (auth.uid() = tutor_id);

CREATE POLICY "Tutors can delete their updates"
ON public.tutor_updates
FOR DELETE
USING (auth.uid() = tutor_id);