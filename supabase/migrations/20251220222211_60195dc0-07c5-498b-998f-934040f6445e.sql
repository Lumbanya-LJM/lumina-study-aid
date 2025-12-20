-- Create conversations table for chat history
CREATE TABLE public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'New Chat',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- RLS policies for conversations
CREATE POLICY "Users can view their own conversations" 
ON public.conversations 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own conversations" 
ON public.conversations 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversations" 
ON public.conversations 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own conversations" 
ON public.conversations 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add conversation_id to chat_messages
ALTER TABLE public.chat_messages 
ADD COLUMN conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE;

-- Create index for faster lookups
CREATE INDEX idx_chat_messages_conversation ON public.chat_messages(conversation_id);
CREATE INDEX idx_conversations_user ON public.conversations(user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_conversations_updated_at
BEFORE UPDATE ON public.conversations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create course_materials table
CREATE TABLE public.course_materials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.academy_courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for course_materials
ALTER TABLE public.course_materials ENABLE ROW LEVEL SECURITY;

-- RLS policies for course_materials
CREATE POLICY "Enrolled users can view course materials" 
ON public.course_materials 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM academy_enrollments 
    WHERE academy_enrollments.course_id = course_materials.course_id 
    AND academy_enrollments.user_id = auth.uid() 
    AND academy_enrollments.status = 'active'
  ) OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Tutors can upload course materials" 
ON public.course_materials 
FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role)
);

CREATE POLICY "Tutors can delete their materials" 
ON public.course_materials 
FOR DELETE 
USING (
  uploaded_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role)
);

-- Create storage buckets for course materials and recordings
INSERT INTO storage.buckets (id, name, public) 
VALUES ('course-materials', 'course-materials', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('class-recordings', 'class-recordings', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for course-materials bucket
CREATE POLICY "Enrolled users can view course materials files" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'course-materials');

CREATE POLICY "Tutors can upload course materials files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'course-materials' 
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role))
);

CREATE POLICY "Tutors can delete course materials files" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'course-materials' 
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role))
);

-- Storage policies for class-recordings bucket
CREATE POLICY "Enrolled users can view class recordings" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'class-recordings');

CREATE POLICY "Tutors can upload class recordings" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'class-recordings' 
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role))
);

CREATE POLICY "Tutors can delete class recordings" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'class-recordings' 
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role))
);