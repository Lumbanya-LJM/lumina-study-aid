-- Create app_role enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create user_roles table for admin management
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check user roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles" ON public.user_roles
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles" ON public.user_roles
FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Create library_content table for admin-uploaded content
CREATE TABLE public.library_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  content_type text NOT NULL DEFAULT 'case', -- 'case', 'paper', 'video', 'alert', 'summary'
  subject text NOT NULL,
  year text,
  citation text, -- For cases
  court text, -- For cases
  file_url text,
  external_url text, -- For ZambiaLii links
  content_text text, -- For case summaries, notes
  is_premium boolean DEFAULT false,
  is_published boolean DEFAULT true,
  tags text[],
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.library_content ENABLE ROW LEVEL SECURITY;

-- Everyone can view published content
CREATE POLICY "Anyone can view published content" ON public.library_content
FOR SELECT USING (is_published = true);

-- Admins can manage all content
CREATE POLICY "Admins can manage content" ON public.library_content
FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at on library_content
CREATE TRIGGER update_library_content_updated_at
BEFORE UPDATE ON public.library_content
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add university and year_of_study to profiles if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'university') THEN
    ALTER TABLE public.profiles ADD COLUMN university text DEFAULT 'University of Zambia';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'year_of_study') THEN
    ALTER TABLE public.profiles ADD COLUMN year_of_study integer DEFAULT 1;
  END IF;
END $$;