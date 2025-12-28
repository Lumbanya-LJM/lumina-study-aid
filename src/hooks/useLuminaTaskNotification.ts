import { useCallback } from 'react';
import { toast } from 'sonner';
import { sounds } from '@/lib/sounds';

type TaskType = 
  | 'flashcards' 
  | 'quiz' 
  | 'journal' 
  | 'summary' 
  | 'task' 
  | 'research'
  | 'general';

interface TaskNotificationOptions {
  taskType: TaskType;
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

const taskMessages: Record<TaskType, { title: string; description: string }> = {
  flashcards: {
    title: '✨ Flashcards Ready!',
    description: 'Lumina has created your flashcard deck.',
  },
  quiz: {
    title: '🧠 Quiz Generated!',
    description: 'Lumina has prepared your practice quiz.',
  },
  journal: {
    title: '📝 Journal Entry Saved',
    description: 'Lumina has responded to your reflection.',
  },
  summary: {
    title: '📋 Summary Complete',
    description: 'Lumina has summarized the content for you.',
  },
  task: {
    title: '✅ Task Updated',
    description: 'Lumina has updated your study planner.',
  },
  research: {
    title: '🔍 Research Complete',
    description: 'Lumina has found relevant information.',
  },
  general: {
    title: '✨ Task Complete',
    description: 'Lumina has completed your request.',
  },
};

export function useLuminaTaskNotification() {
  const notify = useCallback(async (options: TaskNotificationOptions) => {
    const { taskType, title, description, actionLabel, onAction } = options;
    
    const defaultMessage = taskMessages[taskType] || taskMessages.general;
    
    // Play task complete sound
    await sounds.taskComplete();
    
    // Show toast notification
    toast.success(title || defaultMessage.title, {
      description: description || defaultMessage.description,
      duration: 5000,
      ...(actionLabel && onAction && {
        action: {
          label: actionLabel,
          onClick: onAction,
        },
      }),
    });
  }, []);

  const notifyFlashcardsReady = useCallback((deckTitle?: string, onView?: () => void) => {
    notify({
      taskType: 'flashcards',
      description: deckTitle ? `"${deckTitle}" is ready to review.` : undefined,
      actionLabel: onView ? 'Review Now' : undefined,
      onAction: onView,
    });
  }, [notify]);

  const notifyQuizReady = useCallback((quizTitle?: string, onStart?: () => void) => {
    notify({
      taskType: 'quiz',
      description: quizTitle ? `"${quizTitle}" is ready to take.` : undefined,
      actionLabel: onStart ? 'Start Quiz' : undefined,
      onAction: onStart,
    });
  }, [notify]);

  const notifyJournalSaved = useCallback(() => {
    notify({ taskType: 'journal' });
  }, [notify]);

  const notifySummaryComplete = useCallback((onView?: () => void) => {
    notify({
      taskType: 'summary',
      actionLabel: onView ? 'View Summary' : undefined,
      onAction: onView,
    });
  }, [notify]);

  const notifyTaskUpdated = useCallback((taskTitle?: string) => {
    notify({
      taskType: 'task',
      description: taskTitle ? `"${taskTitle}" has been updated.` : undefined,
    });
  }, [notify]);

  const notifyResearchComplete = useCallback((onView?: () => void) => {
    notify({
      taskType: 'research',
      actionLabel: onView ? 'View Results' : undefined,
      onAction: onView,
    });
  }, [notify]);

  const notifyGeneral = useCallback((title: string, description?: string) => {
    notify({
      taskType: 'general',
      title,
      description,
    });
  }, [notify]);

  return {
    notify,
    notifyFlashcardsReady,
    notifyQuizReady,
    notifyJournalSaved,
    notifySummaryComplete,
    notifyTaskUpdated,
    notifyResearchComplete,
    notifyGeneral,
  };
}
