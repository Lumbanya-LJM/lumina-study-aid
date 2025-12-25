-- Fix password_reset_tokens - add RLS policy that blocks all client access
-- The table already has RLS enabled but needs stricter policies
DROP POLICY IF EXISTS "Service role can manage password reset tokens" ON public.password_reset_tokens;

-- Block all access from clients - only service role (edge functions) can access
CREATE POLICY "No client access to reset tokens"
ON public.password_reset_tokens
FOR ALL
TO authenticated, anon
USING (false)
WITH CHECK (false);

-- Require authentication for viewing public study group members
DROP POLICY IF EXISTS "Members can view group members" ON public.study_group_members;
CREATE POLICY "Authenticated users can view group members"
ON public.study_group_members
FOR SELECT
TO authenticated
USING (
  (EXISTS (
    SELECT 1 FROM study_group_members sgm
    WHERE sgm.group_id = study_group_members.group_id 
    AND sgm.user_id = auth.uid()
  ))
  OR 
  (EXISTS (
    SELECT 1 FROM study_groups sg
    WHERE sg.id = study_group_members.group_id 
    AND sg.is_private = false
  ))
);