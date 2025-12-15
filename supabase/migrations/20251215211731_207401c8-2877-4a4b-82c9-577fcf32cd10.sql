-- Study Groups / Community tables
CREATE TABLE public.study_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  subject TEXT,
  created_by UUID NOT NULL,
  is_private BOOLEAN DEFAULT false,
  max_members INTEGER DEFAULT 50,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.study_group_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);

CREATE TABLE public.study_group_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Lumina Academy tables
CREATE TABLE public.academy_courses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL DEFAULT 350,
  institution TEXT DEFAULT 'ZIALE',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.academy_enrollments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  course_id UUID NOT NULL REFERENCES public.academy_courses(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active',
  enrolled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, course_id)
);

CREATE TABLE public.tutor_updates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.academy_courses(id) ON DELETE CASCADE,
  tutor_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  update_type TEXT DEFAULT 'general',
  class_link TEXT,
  class_time TIMESTAMP WITH TIME ZONE,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.study_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_group_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tutor_updates ENABLE ROW LEVEL SECURITY;

-- Study Groups RLS
CREATE POLICY "Anyone can view public groups" ON public.study_groups FOR SELECT USING (is_private = false OR created_by = auth.uid());
CREATE POLICY "Authenticated users can create groups" ON public.study_groups FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Group creators can update their groups" ON public.study_groups FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Group creators can delete their groups" ON public.study_groups FOR DELETE USING (auth.uid() = created_by);

-- Group Members RLS
CREATE POLICY "Members can view group members" ON public.study_group_members FOR SELECT USING (true);
CREATE POLICY "Users can join groups" ON public.study_group_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave groups" ON public.study_group_members FOR DELETE USING (auth.uid() = user_id);

-- Group Messages RLS
CREATE POLICY "Group members can view messages" ON public.study_group_messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.study_group_members WHERE group_id = study_group_messages.group_id AND user_id = auth.uid())
);
CREATE POLICY "Group members can send messages" ON public.study_group_messages FOR INSERT WITH CHECK (
  auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.study_group_members WHERE group_id = study_group_messages.group_id AND user_id = auth.uid())
);

-- Academy Courses RLS (public read, admin write)
CREATE POLICY "Anyone can view active courses" ON public.academy_courses FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage courses" ON public.academy_courses FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Academy Enrollments RLS
CREATE POLICY "Users can view their enrollments" ON public.academy_enrollments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can enroll themselves" ON public.academy_enrollments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their enrollments" ON public.academy_enrollments FOR UPDATE USING (auth.uid() = user_id);

-- Tutor Updates RLS
CREATE POLICY "Enrolled users can view updates" ON public.tutor_updates FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.academy_enrollments WHERE course_id = tutor_updates.course_id AND user_id = auth.uid() AND status = 'active')
  OR has_role(auth.uid(), 'admin'::app_role)
);
CREATE POLICY "Admins can manage updates" ON public.tutor_updates FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert ZIALE courses
INSERT INTO public.academy_courses (name, description, price, institution) VALUES
('Professional Ethics and Conduct', 'Study of legal professional ethics and conduct standards', 350, 'ZIALE'),
('Accounts', 'Legal accounting principles and practices', 350, 'ZIALE'),
('Conveyancing and Legal Drafting', 'Property law and legal document drafting', 350, 'ZIALE'),
('Probate and Succession', 'Estate law and inheritance procedures', 350, 'ZIALE'),
('Commercial Transactions', 'Business and commercial law', 350, 'ZIALE'),
('Company Law and Procedure', 'Corporate law and company procedures', 350, 'ZIALE'),
('Superior Court Procedure', 'High Court and Supreme Court procedures', 350, 'ZIALE'),
('Subordinate Court Procedure', 'Magistrate court procedures', 350, 'ZIALE'),
('Domestic Relations', 'Family law and domestic matters', 350, 'ZIALE'),
('Criminal Procedure', 'Criminal law procedures and processes', 350, 'ZIALE'),
('Evidence', 'Law of evidence and proof', 350, 'ZIALE');

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.study_group_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tutor_updates;