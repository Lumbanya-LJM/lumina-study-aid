-- Fix overly permissive RLS policy on study_group_members
-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Members can view group members" ON public.study_group_members;

-- Create a new policy that restricts viewing to members of the same group or public groups
CREATE POLICY "Members can view group members"
ON public.study_group_members
FOR SELECT
USING (
  -- User can see members of groups they are a member of
  EXISTS (
    SELECT 1 FROM public.study_group_members sgm
    WHERE sgm.group_id = study_group_members.group_id
    AND sgm.user_id = auth.uid()
  )
  OR
  -- User can see members of public groups
  EXISTS (
    SELECT 1 FROM public.study_groups sg
    WHERE sg.id = study_group_members.group_id
    AND sg.is_private = false
  )
);