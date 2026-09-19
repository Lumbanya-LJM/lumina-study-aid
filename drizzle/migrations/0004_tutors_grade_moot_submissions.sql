CREATE POLICY "Tutors and admins view moot submissions"
ON public.moot_submissions FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (SELECT 1 FROM public.tutor_applications ta WHERE ta.user_id = auth.uid() AND ta.status = 'approved')
);

CREATE POLICY "Tutors and admins grade moot submissions"
ON public.moot_submissions FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (SELECT 1 FROM public.tutor_applications ta WHERE ta.user_id = auth.uid() AND ta.status = 'approved')
);