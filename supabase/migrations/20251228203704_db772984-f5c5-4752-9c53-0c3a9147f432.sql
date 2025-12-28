-- Create tutor invitations table
CREATE TABLE public.tutor_invitations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text NOT NULL,
    full_name text,
    selected_courses text[] DEFAULT '{}'::text[],
    invitation_token text NOT NULL UNIQUE,
    invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    status text NOT NULL DEFAULT 'pending',
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '7 days'),
    accepted_at timestamp with time zone,
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.tutor_invitations ENABLE ROW LEVEL SECURITY;

-- Admins can manage all invitations
CREATE POLICY "Admins can manage invitations"
ON public.tutor_invitations
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Anyone can view their own invitation by token (for accepting)
CREATE POLICY "Anyone can view invitation by token"
ON public.tutor_invitations
FOR SELECT
USING (true);

-- Create index for token lookups
CREATE INDEX idx_tutor_invitations_token ON public.tutor_invitations(invitation_token);
CREATE INDEX idx_tutor_invitations_email ON public.tutor_invitations(email);