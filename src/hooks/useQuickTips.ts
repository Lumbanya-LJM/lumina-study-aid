import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'luminary_quick_tips_seen';

export interface QuickTip {
  id: string;
  title: string;
  description: string;
  feature: string;
}

export const quickTipsData: Record<string, QuickTip> = {
  chat_voice: {
    id: 'chat_voice',
    title: 'Voice Input Available',
    description: 'Tap the microphone icon to ask Lumina questions using your voice!',
    feature: 'chat',
  },
  chat_zambialii: {
    id: 'chat_zambialii',
    title: 'Find Legal Cases',
    description: 'Use the scales icon to search ZambiaLII for cases and legislation directly in chat.',
    feature: 'chat',
  },
  focus_modes: {
    id: 'focus_modes',
    title: 'Choose Your Focus Mode',
    description: 'Hard Mode blocks distractions completely. Lite Mode gives gentle reminders.',
    feature: 'focus',
  },
  library_summarize: {
    id: 'library_summarize',
    title: 'AI Case Summaries',
    description: 'Tap the sparkle icon on any case to get an instant AI-powered summary.',
    feature: 'library',
  },
  planner_lumina: {
    id: 'planner_lumina',
    title: 'Smart Scheduling',
    description: 'Ask Lumina to create a study schedule based on your timetable and exams.',
    feature: 'planner',
  },
  flashcards_spaced: {
    id: 'flashcards_spaced',
    title: 'Spaced Repetition',
    description: 'Review cards regularly to move them to "mastered" status for better retention.',
    feature: 'flashcards',
  },
  academy_materials: {
    id: 'academy_materials',
    title: 'Course Materials',
    description: 'Access lecture notes, slides, and resources uploaded by your tutors.',
    feature: 'academy',
  },
  quiz_generate: {
    id: 'quiz_generate',
    title: 'AI-Generated Quizzes',
    description: 'Generate custom quizzes on any topic to test your knowledge.',
    feature: 'quiz',
  },
  journal_private: {
    id: 'journal_private',
    title: 'Private Reflections',
    description: 'Your journal entries are private. Lumina responds with supportive insights.',
    feature: 'journal',
  },
  community_groups: {
    id: 'community_groups',
    title: 'Study Groups',
    description: 'Join or create study groups to collaborate with fellow law students.',
    feature: 'community',
  },
};

export const useQuickTips = () => {
  const [seenTips, setSeenTips] = useState<string[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setSeenTips(JSON.parse(stored));
      } catch {
        setSeenTips([]);
      }
    }
  }, []);

  const hasSeenTip = useCallback((tipId: string): boolean => {
    return seenTips.includes(tipId);
  }, [seenTips]);

  const markTipAsSeen = useCallback((tipId: string) => {
    setSeenTips((prev) => {
      if (prev.includes(tipId)) return prev;
      const updated = [...prev, tipId];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const resetAllTips = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setSeenTips([]);
  }, []);

  const getUnseenTipsForFeature = useCallback((feature: string): QuickTip[] => {
    return Object.values(quickTipsData)
      .filter((tip) => tip.feature === feature && !seenTips.includes(tip.id));
  }, [seenTips]);

  return {
    seenTips,
    hasSeenTip,
    markTipAsSeen,
    resetAllTips,
    getUnseenTipsForFeature,
    quickTipsData,
  };
};
