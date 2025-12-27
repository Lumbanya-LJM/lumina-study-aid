CREATE OR REPLACE FUNCTION public.grant_moderator_role(user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (user_id, 'moderator')
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;
