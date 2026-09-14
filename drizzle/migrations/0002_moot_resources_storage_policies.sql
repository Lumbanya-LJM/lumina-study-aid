CREATE POLICY "Authenticated users can read moot resources"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'moot-resources');

CREATE POLICY "Authenticated users can upload moot resources"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'moot-resources' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Owners can update their moot resources"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'moot-resources' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Owners and admins can delete moot resources"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'moot-resources' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'admin')));