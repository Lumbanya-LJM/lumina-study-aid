-- Add new columns to tutor_applications table
ALTER TABLE public.tutor_applications 
ADD COLUMN IF NOT EXISTS is_employed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS time_flexibility text,
ADD COLUMN IF NOT EXISTS preferred_teaching_times text,
ADD COLUMN IF NOT EXISTS called_to_bar boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS years_at_bar integer,
ADD COLUMN IF NOT EXISTS motivation text,
ADD COLUMN IF NOT EXISTS documents jsonb DEFAULT '[]'::jsonb;

-- Create storage bucket for tutor application documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('tutor-documents', 'tutor-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for tutor-documents bucket
CREATE POLICY "Users can upload their own documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'tutor-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'tutor-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can view all tutor documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'tutor-documents' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can delete their own documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'tutor-documents' AND auth.uid()::text = (storage.foldername(name))[1]);