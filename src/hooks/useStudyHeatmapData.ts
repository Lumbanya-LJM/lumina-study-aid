import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, subDays, startOfDay, parseISO } from 'date-fns';

interface DayData {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

interface SubjectMastery {
  subject: string;
  progress: number;
  hoursStudied: number;
  quizAverage: number;
}

interface WeeklyStats {
  thisWeek: number;
  lastWeek: number;
  percentChange: number;
}

export const useStudyHeatmapData = () => {
  const { user } = useAuth();
  const [heatmapData, setHeatmapData] = useState<DayData[]>([]);
  const [subjectMastery, setSubjectMastery] = useState<SubjectMastery[]>([]);
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats>({ thisWeek: 0, lastWeek: 0, percentChange: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      // Fetch study sessions for the last 365 days
      const startDate = subDays(new Date(), 365);
      
      const { data: sessions } = await supabase
        .from('study_sessions')
        .select('started_at, duration_minutes, title')
        .eq('user_id', user.id)
        .gte('started_at', startDate.toISOString())
        .order('started_at', { ascending: true });

      // Generate heatmap data
      const dateMap = new Map<string, number>();
      
      // Initialize all days with 0
      for (let i = 0; i < 365; i++) {
        const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
        dateMap.set(date, 0);
      }

      // Sum up study minutes per day
      sessions?.forEach(session => {
        const date = format(parseISO(session.started_at), 'yyyy-MM-dd');
        const current = dateMap.get(date) || 0;
        dateMap.set(date, current + (session.duration_minutes || 0));
      });

      // Convert to heatmap format with levels
      const heatmap: DayData[] = Array.from(dateMap.entries()).map(([date, count]) => {
        let level: 0 | 1 | 2 | 3 | 4 = 0;
        if (count > 0 && count <= 30) level = 1;
        else if (count > 30 && count <= 60) level = 2;
        else if (count > 60 && count <= 120) level = 3;
        else if (count > 120) level = 4;
        
        return { date, count, level };
      });

      setHeatmapData(heatmap.reverse());

      // Fetch subject mastery data from flashcard decks and quizzes
      const { data: decks } = await supabase
        .from('flashcard_decks')
        .select('subject, mastered_count, cards')
        .eq('user_id', user.id);

      const { data: quizzes } = await supabase
        .from('quizzes')
        .select('subject, score, total_questions')
        .eq('user_id', user.id)
        .not('completed_at', 'is', null);

      // Calculate subject mastery
      const subjectMap = new Map<string, { hours: number; quizScores: number[]; deckProgress: number[] }>();

      decks?.forEach(deck => {
        const existing = subjectMap.get(deck.subject) || { hours: 0, quizScores: [], deckProgress: [] };
        const cards = Array.isArray(deck.cards) ? deck.cards : [];
        const totalCards = cards.length || 1;
        const masteredCount = deck.mastered_count || 0;
        existing.deckProgress.push((masteredCount / totalCards) * 100);
        subjectMap.set(deck.subject, existing);
      });

      quizzes?.forEach(quiz => {
        const existing = subjectMap.get(quiz.subject) || { hours: 0, quizScores: [], deckProgress: [] };
        if (quiz.score !== null && quiz.total_questions > 0) {
          existing.quizScores.push((quiz.score / quiz.total_questions) * 100);
        }
        subjectMap.set(quiz.subject, existing);
      });

      // Calculate mastery for each subject
      const mastery: SubjectMastery[] = Array.from(subjectMap.entries()).map(([subject, data]) => {
        const avgQuiz = data.quizScores.length > 0 
          ? data.quizScores.reduce((a, b) => a + b, 0) / data.quizScores.length 
          : 0;
        const avgDeck = data.deckProgress.length > 0
          ? data.deckProgress.reduce((a, b) => a + b, 0) / data.deckProgress.length
          : 0;
        
        return {
          subject,
          progress: Math.round((avgQuiz + avgDeck) / 2) || 0,
          hoursStudied: Math.round(data.hours * 10) / 10,
          quizAverage: Math.round(avgQuiz),
        };
      }).slice(0, 5);

      setSubjectMastery(mastery);

      // Calculate weekly comparison
      const today = startOfDay(new Date());
      const thisWeekStart = subDays(today, 7);
      const lastWeekStart = subDays(today, 14);

      let thisWeekMinutes = 0;
      let lastWeekMinutes = 0;

      sessions?.forEach(session => {
        const sessionDate = parseISO(session.started_at);
        if (sessionDate >= thisWeekStart) {
          thisWeekMinutes += session.duration_minutes || 0;
        } else if (sessionDate >= lastWeekStart && sessionDate < thisWeekStart) {
          lastWeekMinutes += session.duration_minutes || 0;
        }
      });

      const thisWeekHours = Math.round((thisWeekMinutes / 60) * 10) / 10;
      const lastWeekHours = Math.round((lastWeekMinutes / 60) * 10) / 10;
      const percentChange = lastWeekHours > 0 
        ? Math.round(((thisWeekHours - lastWeekHours) / lastWeekHours) * 100)
        : thisWeekHours > 0 ? 100 : 0;

      setWeeklyStats({
        thisWeek: thisWeekHours,
        lastWeek: lastWeekHours,
        percentChange,
      });

    } catch (error) {
      console.error('Error fetching study data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    heatmapData,
    subjectMastery,
    weeklyStats,
    isLoading,
    refetch: fetchData,
  };
};
