-- 1. research_cache: only service_role may write
DROP POLICY IF EXISTS "Service role can manage cache" ON public.research_cache;
DROP POLICY IF EXISTS "Anyone can view research cache" ON public.research_cache;

CREATE POLICY "Authenticated users can read research cache"
ON public.research_cache FOR SELECT TO authenticated USING (true);

CREATE POLICY "Service role manages research cache"
ON public.research_cache FOR ALL TO service_role USING (true) WITH CHECK (true);

REVOKE INSERT, UPDATE, DELETE ON public.research_cache FROM anon, authenticated;
GRANT SELECT ON public.research_cache TO authenticated;
GRANT ALL ON public.research_cache TO service_role;

-- 2. tutor_invitations: no public token browsing
DROP POLICY IF EXISTS "Anyone can view invitation by token" ON public.tutor_invitations;

CREATE POLICY "Invitees can accept their own invitation"
ON public.tutor_invitations FOR UPDATE TO authenticated
USING (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')))
WITH CHECK (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));

REVOKE SELECT ON public.tutor_invitations FROM anon;

CREATE OR REPLACE FUNCTION public.get_invitation_by_token(_token text)
RETURNS TABLE (
  id uuid,
  email text,
  full_name text,
  selected_courses text[],
  status text,
  expires_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT i.id, i.email, i.full_name, i.selected_courses, i.status, i.expires_at
  FROM public.tutor_invitations i
  WHERE i.invitation_token = _token
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_invitation_by_token(text) TO anon, authenticated;

-- 3. Paid content storage: restrict direct bucket reads to staff
DROP POLICY IF EXISTS "Enrolled users can view class recordings" ON storage.objects;
DROP POLICY IF EXISTS "Enrolled users can view course materials files" ON storage.objects;

CREATE POLICY "Staff can view class recordings"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'class-recordings'
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'))
);

CREATE POLICY "Enrolled students and staff can view course materials"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'course-materials'
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'moderator')
    OR EXISTS (
      SELECT 1
      FROM public.course_materials cm
      JOIN public.academy_enrollments ae ON ae.course_id = cm.course_id
      WHERE ae.user_id = auth.uid()
        AND ae.status = 'active'
        AND cm.file_url LIKE '%' || storage.objects.name
    )
  )
);