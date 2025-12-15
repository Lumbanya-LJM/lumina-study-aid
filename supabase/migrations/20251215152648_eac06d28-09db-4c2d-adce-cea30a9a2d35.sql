-- Create achievements table for gamification
CREATE TABLE public.achievements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  requirement_type text NOT NULL,
  requirement_value integer NOT NULL DEFAULT 1,
  points integer NOT NULL DEFAULT 10,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create user_achievements table to track which achievements users have earned
CREATE TABLE public.user_achievements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  achievement_id uuid NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  earned_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

-- Enable RLS
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- Achievements are viewable by everyone (public data)
CREATE POLICY "Achievements are viewable by everyone" 
ON public.achievements 
FOR SELECT 
USING (true);

-- Users can view their own earned achievements
CREATE POLICY "Users can view their own achievements" 
ON public.user_achievements 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can earn achievements
CREATE POLICY "Users can earn achievements" 
ON public.user_achievements 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Insert default achievements
INSERT INTO public.achievements (name, description, icon, category, requirement_type, requirement_value, points) VALUES
-- Study streak achievements
('First Spark', 'Complete your first study day', 'flame', 'streak', 'streak_days', 1, 10),
('Week Warrior', 'Maintain a 7-day study streak', 'flame', 'streak', 'streak_days', 7, 50),
('Fortnight Fighter', 'Maintain a 14-day study streak', 'flame', 'streak', 'streak_days', 14, 100),
('Month Master', 'Maintain a 30-day study streak', 'flame', 'streak', 'streak_days', 30, 200),
('Century Champion', 'Maintain a 100-day study streak', 'flame', 'streak', 'streak_days', 100, 500),

-- Quiz achievements
('Quiz Beginner', 'Complete your first quiz', 'brain', 'quiz', 'quizzes_completed', 1, 10),
('Quiz Pro', 'Complete 10 quizzes', 'brain', 'quiz', 'quizzes_completed', 10, 50),
('Quiz Master', 'Complete 50 quizzes', 'brain', 'quiz', 'quizzes_completed', 50, 150),
('Perfect Score', 'Get 100% on a quiz', 'trophy', 'quiz', 'perfect_quiz', 1, 100),

-- Flashcard achievements
('Card Collector', 'Create your first flashcard deck', 'layers', 'flashcards', 'decks_created', 1, 10),
('Deck Builder', 'Create 5 flashcard decks', 'layers', 'flashcards', 'decks_created', 5, 50),
('Memory Master', 'Review 100 flashcards', 'layers', 'flashcards', 'cards_reviewed', 100, 75),

-- Study hours achievements
('First Hour', 'Complete your first study hour', 'clock', 'study', 'study_hours', 1, 10),
('Ten Hour Club', 'Study for 10 hours total', 'clock', 'study', 'study_hours', 10, 50),
('Fifty Hour Scholar', 'Study for 50 hours total', 'clock', 'study', 'study_hours', 50, 150),
('Century Scholar', 'Study for 100 hours total', 'clock', 'study', 'study_hours', 100, 300),

-- Cases achievements
('First Case', 'Read your first case', 'book-open', 'cases', 'cases_read', 1, 10),
('Case Connoisseur', 'Read 10 cases', 'book-open', 'cases', 'cases_read', 10, 50),
('Legal Eagle', 'Read 50 cases', 'book-open', 'cases', 'cases_read', 50, 150),

-- Journal achievements
('Reflective Start', 'Write your first journal entry', 'pen-line', 'journal', 'journal_entries', 1, 10),
('Weekly Reflector', 'Write 7 journal entries', 'pen-line', 'journal', 'journal_entries', 7, 50),
('Mindful Month', 'Write 30 journal entries', 'pen-line', 'journal', 'journal_entries', 30, 150);