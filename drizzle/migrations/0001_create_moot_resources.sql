CREATE TABLE public.moot_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'handbook',
  file_url text NOT NULL,
  file_path text,
  file_name text NOT NULL,
  file_size integer,
  file_type text,
  uploaded_by uuid NOT NULL,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.moot_resources TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.moot_resources TO authenticated;
GRANT ALL ON public.moot_resources TO service_role;

ALTER TABLE public.moot_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published moot resources"
ON public.moot_resources FOR SELECT
USING (is_published = true);

CREATE POLICY "Uploaders and admins insert moot resources"
ON public.moot_resources FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Uploaders and admins update moot resources"
ON public.moot_resources FOR UPDATE
TO authenticated
USING (auth.uid() = uploaded_by OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Uploaders and admins delete moot resources"
ON public.moot_resources FOR DELETE
TO authenticated
USING (auth.uid() = uploaded_by OR public.has_role(auth.uid(), 'admin'));