-- Create avatars storage bucket if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing storage policies if they exist and recreate them
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;

-- Create storage policies for avatars
CREATE POLICY "Avatar images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own avatar" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Fix password_reset_tokens RLS - restrict to service role only
DROP POLICY IF EXISTS "Service role can manage password reset tokens" ON public.password_reset_tokens;
CREATE POLICY "Service role can manage password reset tokens"
ON public.password_reset_tokens
FOR ALL
USING (false)
WITH CHECK (false);

-- Fix class_transcripts - restrict INSERT to service role
DROP POLICY IF EXISTS "System can insert transcripts" ON public.class_transcripts;
DROP POLICY IF EXISTS "Authenticated users can insert transcripts" ON public.class_transcripts;
CREATE POLICY "Only admins can insert transcripts"
ON public.class_transcripts
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Fix class_ai_summaries - restrict INSERT to admins only  
DROP POLICY IF EXISTS "System can insert summaries" ON public.class_ai_summaries;
DROP POLICY IF EXISTS "Authenticated users can insert summaries" ON public.class_ai_summaries;
CREATE POLICY "Only admins can insert AI summaries"
ON public.class_ai_summaries
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Add DELETE policy for study_group_messages so users can delete their own messages
DROP POLICY IF EXISTS "Users can delete their own messages" ON public.study_group_messages;
CREATE POLICY "Users can delete their own messages"
ON public.study_group_messages
FOR DELETE
USING (auth.uid() = user_id);

-- Add UPDATE policy for tutor_applications so applicants can update pending applications
DROP POLICY IF EXISTS "Users can update their pending applications" ON public.tutor_applications;
CREATE POLICY "Users can update their pending applications"
ON public.tutor_applications
FOR UPDATE
USING (auth.uid() = user_id AND status = 'pending');

-- Add DELETE policy for study_sessions
DROP POLICY IF EXISTS "Users can delete their own study sessions" ON public.study_sessions;
CREATE POLICY "Users can delete their own study sessions"
ON public.study_sessions
FOR DELETE
USING (auth.uid() = user_id);