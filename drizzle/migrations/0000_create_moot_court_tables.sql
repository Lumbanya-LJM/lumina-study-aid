CREATE TABLE public.moot_problems (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  area_of_law text NOT NULL,
  court text,
  citation text,
  source_url text,
  difficulty text NOT NULL DEFAULT 'Intermediate',
  summary text,
  facts text NOT NULL,
  issues jsonb NOT NULL DEFAULT '[]'::jsonb,
  appellant_position text,
  respondent_position text,
  authorities jsonb NOT NULL DEFAULT '[]'::jsonb,
  ruling_summary text,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.moot_problems TO anon;
GRANT SELECT ON public.moot_problems TO authenticated;
GRANT ALL ON public.moot_problems TO service_role;

ALTER TABLE public.moot_problems ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published moot problems"
ON public.moot_problems FOR SELECT
USING (is_published = true);

CREATE POLICY "Admins manage moot problems"
ON public.moot_problems FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.moot_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  problem_id uuid NOT NULL REFERENCES public.moot_problems(id) ON DELETE CASCADE,
  side text NOT NULL DEFAULT 'appellant',
  submission_type text NOT NULL DEFAULT 'memorial',
  content text NOT NULL,
  score integer,
  max_score integer NOT NULL DEFAULT 100,
  rubric jsonb NOT NULL DEFAULT '[]'::jsonb,
  feedback text,
  strengths jsonb NOT NULL DEFAULT '[]'::jsonb,
  improvements jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'graded',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.moot_submissions TO authenticated;
GRANT ALL ON public.moot_submissions TO service_role;

ALTER TABLE public.moot_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own moot submissions"
ON public.moot_submissions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users create own moot submissions"
ON public.moot_submissions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own moot submissions"
ON public.moot_submissions FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users delete own moot submissions"
ON public.moot_submissions FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX idx_moot_submissions_user ON public.moot_submissions(user_id, created_at DESC);
CREATE INDEX idx_moot_problems_area ON public.moot_problems(area_of_law);