import { useEffect, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

interface StudyReminder {
  id: string;
  type: 'flashcard_review' | 'upcoming_task' | 'streak_reminder';
  title: string;
  message: string;
  actionUrl?: string;
  priority: 'high' | 'medium' | 'low';
  createdAt: Date;
}

export function useStudyReminders() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reminders, setReminders] = useState<StudyReminder[]>([]);
  const [hasChecked, setHasChecked] = useState(false);

  const checkFlashcardReviews = useCallback(async (): Promise<StudyReminder[]> => {
    if (!user) return [];

    const now = new Date().toISOString();
    const { data: decks } = await supabase
      .from('flashcard_decks')
      .select('id, title, subject, next_review_at, mastered_count, cards')
      .eq('user_id', user.id)
      .lte('next_review_at', now)
      .order('next_review_at');

    if (!decks || decks.length === 0) return [];

    return decks.slice(0, 3).map((deck) => {
      const cards = Array.isArray(deck.cards) ? deck.cards : [];
      const totalCards = cards.length;
      const mastered = deck.mastered_count || 0;
      const remaining = totalCards - mastered;

      return {
        id: `flashcard-${deck.id}`,
        type: 'flashcard_review' as const,
        title: `Review: ${deck.title}`,
        message: `${remaining} cards due for spaced repetition review in ${deck.subject}`,
        actionUrl: `/flashcards?deckId=${deck.id}`,
        priority: remaining > 10 ? 'high' : remaining > 5 ? 'medium' : 'low',
        createdAt: new Date(),
      };
    });
  }, [user]);

  const checkUpcomingTasks = useCallback(async (): Promise<StudyReminder[]> => {
    if (!user) return [];

    const today = new Date().toISOString().split('T')[0];
    const { data: tasks } = await supabase
      .from('study_tasks')
      .select('id, title, scheduled_time, task_type')
      .eq('user_id', user.id)
      .eq('scheduled_date', today)
      .eq('completed', false)
      .order('scheduled_time');

    if (!tasks || tasks.length === 0) return [];

    return tasks.slice(0, 3).map((task) => ({
      id: `task-${task.id}`,
      type: 'upcoming_task' as const,
      title: task.title,
      message: task.scheduled_time 
        ? `Scheduled for ${task.scheduled_time}` 
        : 'No time set - plan your study session',
      actionUrl: '/planner',
      priority: 'medium' as const,
      createdAt: new Date(),
    }));
  }, [user]);

  const checkStreakReminder = useCallback(async (): Promise<StudyReminder[]> => {
    if (!user) return [];

    const { data: profile } = await supabase
      .from('profiles')
      .select('streak_days')
      .eq('user_id', user.id)
      .single();

    if (!profile) return [];

    const streak = profile.streak_days || 0;
    
    // Check if user has studied today
    const today = new Date().toISOString().split('T')[0];
    const { data: sessions } = await supabase
      .from('study_sessions')
      .select('id')
      .eq('user_id', user.id)
      .gte('started_at', `${today}T00:00:00`)
      .limit(1);

    const hasStudiedToday = sessions && sessions.length > 0;

    if (hasStudiedToday || streak === 0) return [];

    return [{
      id: 'streak-reminder',
      type: 'streak_reminder' as const,
      title: `Keep your ${streak}-day streak!`,
      message: "Don't forget to study today to maintain your learning momentum",
      actionUrl: '/focus',
      priority: streak >= 7 ? 'high' : 'medium',
      createdAt: new Date(),
    }];
  }, [user]);

  const fetchReminders = useCallback(async () => {
    if (!user) return;

    const [flashcardReminders, taskReminders, streakReminders] = await Promise.all([
      checkFlashcardReviews(),
      checkUpcomingTasks(),
      checkStreakReminder(),
    ]);

    const allReminders = [...flashcardReminders, ...taskReminders, ...streakReminders]
      .sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });

    setReminders(allReminders);
    setHasChecked(true);

    // Show toast for high-priority reminders
    if (allReminders.length > 0 && allReminders[0].priority === 'high') {
      toast({
        title: `📚 ${allReminders[0].title}`,
        description: allReminders[0].message,
      });
    }
  }, [user, checkFlashcardReviews, checkUpcomingTasks, checkStreakReminder, toast]);

  useEffect(() => {
    if (user && !hasChecked) {
      // Delay initial check to not overwhelm on page load
      const timer = setTimeout(fetchReminders, 2000);
      return () => clearTimeout(timer);
    }
  }, [user, hasChecked, fetchReminders]);

  const dismissReminder = useCallback((reminderId: string) => {
    setReminders(prev => prev.filter(r => r.id !== reminderId));
  }, []);

  return {
    reminders,
    fetchReminders,
    dismissReminder,
    hasReminders: reminders.length > 0,
  };
}
