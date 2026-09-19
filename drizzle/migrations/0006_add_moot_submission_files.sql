ALTER TABLE public.moot_submissions
  ADD COLUMN IF NOT EXISTS file_path text,
  ADD COLUMN IF NOT EXISTS file_name text,
  ADD COLUMN IF NOT EXISTS file_type text;

CREATE INDEX IF NOT EXISTS moot_submissions_user_created_idx
  ON public.moot_submissions (user_id, created_at DESC);

CREATE POLICY "Students upload own moot submissions"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'moot-submissions'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Students read own moot submissions"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'moot-submissions'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.tutor_applications ta
      WHERE ta.user_id = auth.uid() AND ta.status = 'approved'
    )
  )
);

CREATE POLICY "Students delete own moot submissions"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'moot-submissions'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.has_role(auth.uid(), 'admin')
  )
);