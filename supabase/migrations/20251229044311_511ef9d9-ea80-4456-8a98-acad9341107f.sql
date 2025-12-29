-- Add tutor_id column to academy_courses to properly assign tutors
ALTER TABLE public.academy_courses 
ADD COLUMN tutor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add index for faster lookups
CREATE INDEX idx_academy_courses_tutor_id ON public.academy_courses(tutor_id);

-- Create a function to notify students when tutor is assigned/changed
CREATE OR REPLACE FUNCTION public.notify_tutor_change()
RETURNS TRIGGER AS $$
DECLARE
  course_name TEXT;
  tutor_name TEXT;
  enrolled_user RECORD;
BEGIN
  -- Only trigger if tutor_id changed
  IF (OLD.tutor_id IS DISTINCT FROM NEW.tutor_id) AND NEW.tutor_id IS NOT NULL THEN
    -- Get course name
    course_name := NEW.name;
    
    -- Get tutor name from profiles
    SELECT full_name INTO tutor_name 
    FROM public.profiles 
    WHERE user_id = NEW.tutor_id;
    
    -- If no profile, try tutor_applications
    IF tutor_name IS NULL THEN
      SELECT full_name INTO tutor_name 
      FROM public.tutor_applications 
      WHERE user_id = NEW.tutor_id AND status = 'approved';
    END IF;
    
    -- Log the change (actual notifications will be sent via edge function)
    RAISE NOTICE 'Tutor % assigned to course %', tutor_name, course_name;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for tutor changes
DROP TRIGGER IF EXISTS on_tutor_change ON public.academy_courses;
CREATE TRIGGER on_tutor_change
  AFTER UPDATE OF tutor_id ON public.academy_courses
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_tutor_change();