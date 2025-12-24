import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  requirement_type: string;
  requirement_value: number;
  points: number;
}

interface UserAchievement {
  id: string;
  achievement_id: string;
  earned_at: string;
  achievement: Achievement;
}

interface UseAchievementsReturn {
  achievements: Achievement[];
  earnedAchievements: UserAchievement[];
  totalPoints: number;
  isLoading: boolean;
  checkAndAwardAchievements: () => Promise<void>;
  getProgress: (achievement: Achievement) => { current: number; required: number; percentage: number };
}

export const useAchievements = (): UseAchievementsReturn => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [earnedAchievements, setEarnedAchievements] = useState<UserAchievement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userStats, setUserStats] = useState({
    streak_days: 0,
    total_study_hours: 0,
    tasks_completed: 0,
    cases_read: 0,
    quizzes_completed: 0,
    decks_created: 0,
    journal_entries: 0,
  });

  // Fetch all achievements and user's earned achievements
  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      // Fetch all achievements
      const { data: allAchievements, error: achievementsError } = await supabase
        .from('achievements')
        .select('*')
        .order('points', { ascending: true });

      if (achievementsError) throw achievementsError;
      setAchievements(allAchievements || []);

      // Fetch user's earned achievements
      const { data: earned, error: earnedError } = await supabase
        .from('user_achievements')
        .select(`
          id,
          achievement_id,
          earned_at,
          achievement:achievements(*)
        `)
        .eq('user_id', user.id);

      if (earnedError) throw earnedError;
      setEarnedAchievements(earned as unknown as UserAchievement[] || []);

      // Fetch user stats from profile (profile row may not exist yet)
      const { data: profile } = await supabase
        .from('profiles')
        .select('streak_days, total_study_hours, tasks_completed, cases_read')
        .eq('user_id', user.id)
        .maybeSingle();

      // Fetch quiz count
      const { count: quizCount } = await supabase
        .from('quizzes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .not('completed_at', 'is', null);

      // Fetch flashcard deck count
      const { count: deckCount } = await supabase
        .from('flashcard_decks')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // Fetch journal entry count
      const { count: journalCount } = await supabase
        .from('journal_entries')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      setUserStats({
        streak_days: profile?.streak_days || 0,
        total_study_hours: profile?.total_study_hours || 0,
        tasks_completed: profile?.tasks_completed || 0,
        cases_read: profile?.cases_read || 0,
        quizzes_completed: quizCount || 0,
        decks_created: deckCount || 0,
        journal_entries: journalCount || 0,
      });
    } catch (error) {
      console.error('Error fetching achievements:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkAndAwardAchievements = useCallback(async () => {
    if (!user) return;

    const earnedIds = new Set(earnedAchievements.map(ea => ea.achievement_id));
    const newlyEarned: Achievement[] = [];

    for (const achievement of achievements) {
      if (earnedIds.has(achievement.id)) continue;

      let currentValue = 0;

      switch (achievement.requirement_type) {
        case 'streak_days':
          currentValue = userStats.streak_days;
          break;
        case 'study_hours':
          currentValue = userStats.total_study_hours;
          break;
        case 'quizzes_completed':
          currentValue = userStats.quizzes_completed;
          break;
        case 'decks_created':
          currentValue = userStats.decks_created;
          break;
        case 'cases_read':
          currentValue = userStats.cases_read;
          break;
        case 'journal_entries':
          currentValue = userStats.journal_entries;
          break;
        default:
          continue;
      }

      if (currentValue >= achievement.requirement_value) {
        // Award achievement
        const { error } = await supabase
          .from('user_achievements')
          .insert({
            user_id: user.id,
            achievement_id: achievement.id,
          });

        if (!error) {
          newlyEarned.push(achievement);
        }
      }
    }

    // Show toast for each newly earned achievement
    for (const achievement of newlyEarned) {
      toast({
        title: '🏆 Achievement Unlocked!',
        description: `${achievement.name} - ${achievement.description}`,
      });
    }

    // Refresh data if achievements were earned
    if (newlyEarned.length > 0) {
      await fetchData();
    }
  }, [user, achievements, earnedAchievements, userStats, toast]);

  const getProgress = useCallback((achievement: Achievement) => {
    let current = 0;

    switch (achievement.requirement_type) {
      case 'streak_days':
        current = userStats.streak_days;
        break;
      case 'study_hours':
        current = userStats.total_study_hours;
        break;
      case 'quizzes_completed':
        current = userStats.quizzes_completed;
        break;
      case 'decks_created':
        current = userStats.decks_created;
        break;
      case 'cases_read':
        current = userStats.cases_read;
        break;
      case 'journal_entries':
        current = userStats.journal_entries;
        break;
      default:
        current = 0;
    }

    const percentage = Math.min((current / achievement.requirement_value) * 100, 100);

    return {
      current,
      required: achievement.requirement_value,
      percentage,
    };
  }, [userStats]);

  const totalPoints = earnedAchievements.reduce(
    (sum, ea) => sum + (ea.achievement?.points || 0),
    0
  );

  return {
    achievements,
    earnedAchievements,
    totalPoints,
    isLoading,
    checkAndAwardAchievements,
    getProgress,
  };
};
