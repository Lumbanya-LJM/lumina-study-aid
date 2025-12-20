import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { sounds, initSoundState, isSoundEnabledState, setSoundEnabled } from '@/lib/sounds';
import { useToast } from './use-toast';

export function useSoundNotifications() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isEnabled, setIsEnabled] = useState(true);

  // Initialize sound state
  useEffect(() => {
    initSoundState();
    setIsEnabled(isSoundEnabledState());
  }, []);

  // Subscribe to live class status changes
  useEffect(() => {
    if (!user) return;

    // Listen for classes going live
    const classChannel = supabase
      .channel('sound-class-notifications')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'live_classes',
        },
        async (payload) => {
          const newStatus = payload.new.status;
          const oldStatus = payload.old?.status;
          
          // Class just went live
          if (newStatus === 'live' && oldStatus !== 'live') {
            await sounds.classStart();
            toast({
              title: '🔴 Class is Live!',
              description: `"${payload.new.title}" has started. Join now!`,
            });
          }
        }
      )
      .subscribe();

    // Listen for new tutor updates
    const updateChannel = supabase
      .channel('sound-update-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'tutor_updates',
        },
        async (payload) => {
          if (payload.new.is_published) {
            await sounds.newUpdate();
            toast({
              title: '📢 New Update',
              description: `${payload.new.title}`,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(classChannel);
      supabase.removeChannel(updateChannel);
    };
  }, [user, toast]);

  const toggleSound = useCallback(() => {
    const newState = !isEnabled;
    setSoundEnabled(newState);
    setIsEnabled(newState);
    return newState;
  }, [isEnabled]);

  const playTestSound = useCallback(async () => {
    await sounds.success();
  }, []);

  return {
    isEnabled,
    toggleSound,
    playTestSound,
    sounds,
  };
}
