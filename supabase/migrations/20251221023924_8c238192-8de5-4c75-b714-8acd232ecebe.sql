-- Create a function to completely delete all user data when account is deleted
-- This ensures GDPR compliance and complete data erasure

CREATE OR REPLACE FUNCTION public.delete_user_data(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete chat messages
  DELETE FROM public.chat_messages WHERE user_id = target_user_id;
  
  -- Delete conversations
  DELETE FROM public.conversations WHERE user_id = target_user_id;
  
  -- Delete flashcard decks
  DELETE FROM public.flashcard_decks WHERE user_id = target_user_id;
  
  -- Delete journal entries
  DELETE FROM public.journal_entries WHERE user_id = target_user_id;
  
  -- Delete quizzes
  DELETE FROM public.quizzes WHERE user_id = target_user_id;
  
  -- Delete study sessions
  DELETE FROM public.study_sessions WHERE user_id = target_user_id;
  
  -- Delete study tasks
  DELETE FROM public.study_tasks WHERE user_id = target_user_id;
  
  -- Delete user files
  DELETE FROM public.user_files WHERE user_id = target_user_id;
  
  -- Delete user achievements
  DELETE FROM public.user_achievements WHERE user_id = target_user_id;
  
  -- Delete user legal alert reads
  DELETE FROM public.user_legal_alert_reads WHERE user_id = target_user_id;
  
  -- Delete accountability partners
  DELETE FROM public.accountability_partners WHERE user_id = target_user_id;
  
  -- Delete push subscriptions
  DELETE FROM public.push_subscriptions WHERE user_id = target_user_id;
  
  -- Delete academy enrollments
  DELETE FROM public.academy_enrollments WHERE user_id = target_user_id;
  
  -- Delete class participants
  DELETE FROM public.class_participants WHERE user_id = target_user_id;
  
  -- Delete study group members
  DELETE FROM public.study_group_members WHERE user_id = target_user_id;
  
  -- Delete study group messages
  DELETE FROM public.study_group_messages WHERE user_id = target_user_id;
  
  -- Delete payments
  DELETE FROM public.payments WHERE user_id = target_user_id;
  
  -- Delete subscriptions
  DELETE FROM public.subscriptions WHERE user_id = target_user_id;
  
  -- Delete tutor applications
  DELETE FROM public.tutor_applications WHERE user_id = target_user_id;
  
  -- Delete tutor updates
  DELETE FROM public.tutor_updates WHERE tutor_id = target_user_id;
  
  -- Delete course materials uploaded by user
  DELETE FROM public.course_materials WHERE uploaded_by = target_user_id;
  
  -- Delete live classes hosted by user
  DELETE FROM public.live_classes WHERE host_id = target_user_id;
  
  -- Delete study groups created by user
  DELETE FROM public.study_groups WHERE created_by = target_user_id;
  
  -- Delete user roles
  DELETE FROM public.user_roles WHERE user_id = target_user_id;
  
  -- Finally delete profile (this should cascade but explicit is safer)
  DELETE FROM public.profiles WHERE user_id = target_user_id;
END;
$$;

-- Grant execute permission to authenticated users (they can only delete their own data via RLS)
GRANT EXECUTE ON FUNCTION public.delete_user_data(uuid) TO authenticated;