-- Add target_students column to tutor_applications table
ALTER TABLE public.tutor_applications 
ADD COLUMN target_students text[] DEFAULT '{}';

-- Add comment for documentation
COMMENT ON COLUMN public.tutor_applications.target_students IS 'Target student categories: university, ziale';