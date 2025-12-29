-- Create enum for LMV schools
CREATE TYPE public.lmv_school AS ENUM ('law', 'business');

-- Add school column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN school public.lmv_school DEFAULT 'law';

-- Add school column to academy_courses table  
ALTER TABLE public.academy_courses
ADD COLUMN school public.lmv_school DEFAULT 'law';

-- Update existing courses to be part of LMV Law (all current courses are law courses)
UPDATE public.academy_courses SET school = 'law' WHERE school IS NULL;

-- Create index for efficient school-based queries
CREATE INDEX idx_profiles_school ON public.profiles(school);
CREATE INDEX idx_academy_courses_school ON public.academy_courses(school);

-- Insert LMV Business courses
INSERT INTO public.academy_courses (name, description, price, institution, school, is_active) VALUES
('Financial Accounting', 'Fundamentals of financial accounting and reporting', 350, 'University', 'business', true),
('Management Accounting', 'Cost accounting and management decision-making', 350, 'University', 'business', true),
('Business Law', 'Legal framework for business operations', 350, 'University', 'business', true),
('Principles of Marketing', 'Core marketing concepts and strategies', 350, 'University', 'business', true),
('Business Communication', 'Professional communication skills for business', 350, 'University', 'business', true),
('Entrepreneurship', 'Starting and managing new ventures', 350, 'University', 'business', true),
('Corporate Finance', 'Financial management and investment decisions', 350, 'University', 'business', true),
('Human Resource Management', 'Managing people and organizational behavior', 350, 'University', 'business', true),
('Strategic Management', 'Business strategy formulation and implementation', 350, 'University', 'business', true),
('Economics for Business', 'Micro and macroeconomics for business decisions', 350, 'University', 'business', true),
('Auditing and Assurance', 'Audit principles and professional practice', 350, 'ZICPA', 'business', true),
('Taxation', 'Tax law and compliance for businesses', 350, 'ZICPA', 'business', true);

-- Comment for clarity
COMMENT ON COLUMN public.profiles.school IS 'The LMV school the student belongs to (law or business)';