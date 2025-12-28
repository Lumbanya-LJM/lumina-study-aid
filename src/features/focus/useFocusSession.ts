import { useState, useEffect } from 'react';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { supabase } from '@/integrations/supabase/client';
import { notificationManager } from './notificationManager';

// 1. Define types
export type SessionPhase = 'focus' | 'break';
export type SessionStatus = 'started' | 'completed' | 'interrupted';

export interface FocusSessionSettings {
  focusDuration: number;
  breakDuration: number;
}

interface FocusSessionState {
  isActive: boolean;
  phase: SessionPhase;
  startTime: number | null;
  settings: FocusSessionSettings;
  isDialogOpen: boolean;
  completedCycles: number;
  actions: {
    startSession: (settings?: Partial<FocusSessionSettings>) => void;
    endSession: (status: SessionStatus) => void;
    setPhase: (phase: SessionPhase) => void;
    updateSettings: (newSettings: Partial<FocusSessionSettings>) => void;
    openDialog: () => void;
    closeDialog: () => void;
    startNextPhase: () => void;
  };
}

// 2. Default settings as per requirements
const defaultSettings: FocusSessionSettings = {
  focusDuration: 50 * 60, // 50 minutes in seconds
  breakDuration: 10 * 60, // 10 minutes in seconds
};

// 3. Create a Zustand store for session management
export const useFocusSessionStore = create<FocusSessionState>()(
  persist(
    (set, get) => ({
      isActive: false,
      phase: 'focus',
      startTime: null,
      settings: defaultSettings,
      isDialogOpen: false,
      completedCycles: 0,
      actions: {
        startSession: async (settings) => {
          notificationManager.suppress();
          const newSettings = { ...get().settings, ...settings };
          const startTime = Date.now();
          set({
            isActive: true,
            phase: 'focus',
            startTime: startTime,
            settings: newSettings,
            isDialogOpen: false,
            completedCycles: 0,
          });
          try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              await supabase.from('focus_sessions').insert({
                user_id: user.id,
                start_time: new Date(startTime).toISOString(),
                status: 'started',
                settings: newSettings,
              });
            }
          } catch (error) {
            console.error('Error starting focus session:', error);
          }
        },
        endSession: async (status: SessionStatus) => {
          notificationManager.unsuppress();
          const startTime = get().startTime;
          set({ isActive: false, startTime: null, isDialogOpen: false });
          try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user && startTime) {
              await supabase
                .from('focus_sessions')
                .update({
                  end_time: new Date().toISOString(),
                  status: status,
                })
                .eq('user_id', user.id)
                .eq('start_time', new Date(startTime).toISOString());
            }
          } catch (error) {
            console.error('Error ending focus session:', error);
          }
        },
        setPhase: (phase) => {
          set({ phase });
        },
        updateSettings: (newSettings) => {
          set((state) => ({ settings: { ...state.settings, ...newSettings } }));
        },
        openDialog: () => set({ isDialogOpen: true }),
        closeDialog: () => set({ isDialogOpen: false }),
        startNextPhase: () => {
          const { phase, actions, completedCycles } = get();
          const nextPhase = phase === 'focus' ? 'break' : 'focus';

          if (nextPhase === 'focus') {
            set({ completedCycles: completedCycles + 1 });
          }

          set({ phase: nextPhase, startTime: Date.now() });
        }
      },
    }),
    {
      name: 'focus-session-storage', // Key for localStorage
      storage: createJSONStorage(() => localStorage),
      // Only persist a subset of the state
      partialize: (state) => ({
        isActive: state.isActive,
        phase: state.phase,
        startTime: state.startTime,
        settings: state.settings,
        completedCycles: state.completedCycles,
      }),
    }
  )
);

// 4. Custom hook to manage the timer and interact with the store
export const useFocusSession = () => {
  // Select primitives individually to avoid creating new objects every render
  const isActive = useFocusSessionStore((s) => s.isActive);
  const phase = useFocusSessionStore((s) => s.phase);
  const startTime = useFocusSessionStore((s) => s.startTime);
  const settings = useFocusSessionStore((s) => s.settings);
  const actions = useFocusSessionStore((s) => s.actions);

  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!isActive || !startTime) {
      setTimeLeft(null);
      return;
    }

    const computeTimeLeft = () => {
      const duration = phase === 'focus' ? settings.focusDuration : settings.breakDuration;
      const elapsed = Math.floor((Date.now() - startTime) / 1000);

      if (elapsed >= duration) {
        actions.startNextPhase();
        const nextPhase = phase === 'focus' ? 'break' : 'focus';
        return nextPhase === 'focus' ? settings.focusDuration : settings.breakDuration;
      }

      return duration - elapsed;
    };

    setTimeLeft(computeTimeLeft());

    const timer = setInterval(() => {
      setTimeLeft(computeTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [isActive, startTime, phase, settings.focusDuration, settings.breakDuration, actions]);

  return {
    isActive,
    phase,
    timeLeft,
    settings,
    startSession: actions.startSession,
    endSession: actions.endSession,
    updateSettings: actions.updateSettings,
    formattedTimeLeft:
      timeLeft !== null
        ? `${Math.floor(timeLeft / 60)
            .toString()
            .padStart(2, '0')}:${(timeLeft % 60).toString().padStart(2, '0')}`
        : '00:00',
  };
};

// Selector to easily access actions from anywhere in the app
export const useFocusSessionActions = () => useFocusSessionStore((state) => state.actions);
