-- Add columns to tutor_applications for course selection, DOB, sex
ALTER TABLE public.tutor_applications 
ADD COLUMN IF NOT EXISTS selected_courses text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS date_of_birth date,
ADD COLUMN IF NOT EXISTS sex text;

-- Add a comment explaining the course selection rules
COMMENT ON COLUMN public.tutor_applications.selected_courses IS 'Array of course IDs. Rules: Max 3 ZIALE OR Max 3 Undergrad, OR 1 ZIALE + 2 Undergrad';