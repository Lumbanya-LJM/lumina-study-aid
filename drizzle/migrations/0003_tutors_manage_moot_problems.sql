CREATE POLICY "Approved tutors insert moot problems"
ON public.moot_problems FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tutor_applications ta
    WHERE ta.user_id = auth.uid() AND ta.status = 'approved'
  )
);

CREATE POLICY "Approved tutors update moot problems"
ON public.moot_problems FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tutor_applications ta
    WHERE ta.user_id = auth.uid() AND ta.status = 'approved'
  )
);

CREATE POLICY "Approved tutors delete moot problems"
ON public.moot_problems FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tutor_applications ta
    WHERE ta.user_id = auth.uid() AND ta.status = 'approved'
  )
);