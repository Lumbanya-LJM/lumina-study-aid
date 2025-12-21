-- Create tutor_applications table for admin-controlled tutor enrollment
CREATE TABLE public.tutor_applications (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    qualifications TEXT,
    experience TEXT,
    subjects TEXT[],
    status TEXT NOT NULL DEFAULT 'pending',
    reviewed_by UUID,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tutor_applications ENABLE ROW LEVEL SECURITY;

-- Users can view their own applications
CREATE POLICY "Users can view their own applications"
ON public.tutor_applications
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own applications
CREATE POLICY "Users can create their own applications"
ON public.tutor_applications
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can manage all applications
CREATE POLICY "Admins can manage all applications"
ON public.tutor_applications
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Create index for faster lookups
CREATE INDEX idx_tutor_applications_user_id ON public.tutor_applications(user_id);
CREATE INDEX idx_tutor_applications_status ON public.tutor_applications(status);

-- Create trigger for updated_at
CREATE TRIGGER update_tutor_applications_updated_at
    BEFORE UPDATE ON public.tutor_applications
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();