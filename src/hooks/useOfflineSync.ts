import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import {
  saveOfflineDeck,
  getOfflineDecks,
  saveOfflineQuiz,
  getOfflineQuizzes,
  getPendingSyncs,
  clearPendingSyncs,
  isOfflineSupported,
} from '@/lib/offlineStorage';

interface UseOfflineSyncReturn {
  isOnline: boolean;
  isSupported: boolean;
  isSyncing: boolean;
  lastSyncTime: Date | null;
  offlineDecksCount: number;
  offlineQuizzesCount: number;
  syncNow: () => Promise<void>;
  downloadForOffline: () => Promise<void>;
}

export const useOfflineSync = (): UseOfflineSyncReturn => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [offlineDecksCount, setOfflineDecksCount] = useState(0);
  const [offlineQuizzesCount, setOfflineQuizzesCount] = useState(0);

  const isSupported = isOfflineSupported();

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast({
        title: 'Back online',
        description: 'Your connection has been restored.',
      });
      // Auto-sync when coming back online
      syncNow();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast({
        title: 'You\'re offline',
        description: 'Your flashcards and quizzes are still available.',
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load offline counts on mount
  useEffect(() => {
    if (isSupported) {
      loadOfflineCounts();
    }
  }, [isSupported]);

  const loadOfflineCounts = async () => {
    try {
      const decks = await getOfflineDecks();
      const quizzes = await getOfflineQuizzes();
      setOfflineDecksCount(decks.length);
      setOfflineQuizzesCount(quizzes.length);
    } catch (error) {
      console.error('Error loading offline counts:', error);
    }
  };

  const syncNow = useCallback(async () => {
    if (!isOnline || !user || isSyncing) return;

    setIsSyncing(true);

    try {
      // Get pending syncs
      const pendingSyncs = await getPendingSyncs();

      for (const sync of pendingSyncs) {
        if (sync.type === 'flashcard_review') {
          // Update flashcard deck in database
          await supabase
            .from('flashcard_decks')
            .update({
              last_reviewed_at: new Date().toISOString(),
              mastered_count: sync.data.masteredCount,
            })
            .eq('id', sync.data.deckId)
            .eq('user_id', user.id);
        } else if (sync.type === 'quiz_complete') {
          // Update quiz in database
          await supabase
            .from('quizzes')
            .update({
              completed_at: new Date().toISOString(),
              score: sync.data.score,
            })
            .eq('id', sync.data.quizId)
            .eq('user_id', user.id);
        }
      }

      // Clear pending syncs after successful sync
      await clearPendingSyncs();

      setLastSyncTime(new Date());

      if (pendingSyncs.length > 0) {
        toast({
          title: 'Synced successfully',
          description: `${pendingSyncs.length} offline action(s) synced.`,
        });
      }
    } catch (error) {
      console.error('Error syncing:', error);
      toast({
        variant: 'destructive',
        title: 'Sync failed',
        description: 'Some changes couldn\'t be synced. Will retry later.',
      });
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, user, isSyncing, toast]);

  const downloadForOffline = useCallback(async () => {
    if (!user || !isOnline) {
      toast({
        variant: 'destructive',
        title: 'Cannot download',
        description: isOnline ? 'Please sign in first.' : 'You need to be online to download content.',
      });
      return;
    }

    setIsSyncing(true);

    try {
      // Download flashcard decks
      const { data: decks, error: decksError } = await supabase
        .from('flashcard_decks')
        .select('*')
        .eq('user_id', user.id);

      if (decksError) throw decksError;

      for (const deck of decks || []) {
        await saveOfflineDeck({
          id: deck.id,
          title: deck.title,
          subject: deck.subject,
          cards: deck.cards as any[],
          lastSynced: Date.now(),
        });
      }

      // Download quizzes
      const { data: quizzes, error: quizzesError } = await supabase
        .from('quizzes')
        .select('*')
        .eq('user_id', user.id)
        .is('completed_at', null);

      if (quizzesError) throw quizzesError;

      for (const quiz of quizzes || []) {
        await saveOfflineQuiz({
          id: quiz.id,
          title: quiz.title,
          subject: quiz.subject,
          questions: quiz.questions as any[],
          lastSynced: Date.now(),
        });
      }

      await loadOfflineCounts();
      setLastSyncTime(new Date());

      toast({
        title: 'Downloaded for offline use',
        description: `${decks?.length || 0} decks and ${quizzes?.length || 0} quizzes saved.`,
      });
    } catch (error) {
      console.error('Error downloading for offline:', error);
      toast({
        variant: 'destructive',
        title: 'Download failed',
        description: 'Could not download content for offline use.',
      });
    } finally {
      setIsSyncing(false);
    }
  }, [user, isOnline, toast]);

  return {
    isOnline,
    isSupported,
    isSyncing,
    lastSyncTime,
    offlineDecksCount,
    offlineQuizzesCount,
    syncNow,
    downloadForOffline,
  };
};
