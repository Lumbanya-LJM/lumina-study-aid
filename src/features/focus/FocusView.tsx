import React, { useCallback } from 'react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { LuminaAvatar } from '@/components/lumina/LuminaAvatar';
import { ArrowLeft, Play, Pause, RotateCcw, Coffee, SkipForward, Home, Settings, Moon, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useFocusSession, useFocusSessionStore } from './useFocusSession';
import { FocusSettings } from './FocusSettings';
import { FocusModeDialog } from './FocusModeDialog';

const FocusView: React.FC = () => {
  const navigate = useNavigate();
  const {
    isActive,
    phase,
    timeLeft,
    settings,
    startSession,
    endSession,
    formattedTimeLeft,
  } = useFocusSession();
  const { isDialogOpen, actions } = useFocusSessionStore(state => ({
    isDialogOpen: state.isDialogOpen,
    actions: state.actions,
  }));

  const totalTime = phase === 'focus' ? settings.focusDuration : settings.breakDuration;
  const progress = timeLeft !== null ? ((totalTime - timeLeft) / totalTime) * 100 : 0;

  const getPhaseLabel = (): string => {
    switch (phase) {
      case 'focus':
        return 'Focus Time';
      case 'break':
        return 'Break Time';
      default:
        return 'Focus Time';
    }
  };

  const getPhaseColor = (): string => {
    switch (phase) {
      case 'focus':
        return 'bg-primary';
      case 'break':
        return 'bg-emerald-600';
      default:
        return 'bg-primary';
    }
  };

    // For now, we will just start a default session.
    // In the future, we can re-introduce the concept of different focus modes.
    const handleStartSession = () => {
        startSession();
    }

  if (!isActive) {
    return (
      <MobileLayout showNav={false}>
        <div className="flex flex-col min-h-screen py-6 safe-top">
          {/* Header */}
          <div className="flex items-center justify-between gap-4 mb-8">
            <button
              onClick={() => navigate('/')}
              className="p-2 rounded-xl hover:bg-secondary transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <h1 className="text-lg font-semibold text-foreground">Deep Focus Mode</h1>
            <FocusSettings />
          </div>

          {/* Mode Selection */}
          <div className="flex-1 flex flex-col items-center justify-center">
            <LuminaAvatar size="xl" />
            <h2 className="text-2xl font-bold text-foreground mt-6 mb-2">Ready to Focus?</h2>
            <p className="text-muted-foreground text-center mb-8">
              Click the button below to start your session.
            </p>

            <div className="w-full space-y-4">
              <button
                onClick={handleStartSession}
                className="w-full bg-card rounded-2xl p-5 border border-border/50 shadow-card text-left hover:shadow-premium hover:border-primary/30 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center">
                    <Play className="w-7 h-7 text-primary-foreground" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-foreground text-lg">Start Focus Session</h3>
                    <p className="text-sm text-muted-foreground">
                      Begin a {settings.focusDuration / 60}-minute focus session.
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </MobileLayout>
    );
  }

  // Timer Screen
  return (
    <>
      <MobileLayout showNav={false}>
        <div className={cn("flex flex-col min-h-screen transition-colors duration-500", getPhaseColor())}>
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-6 safe-top">
            <button
              onClick={actions.openDialog}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <div className="flex items-center gap-2">
              <span className={cn(
                "px-3 py-1 rounded-full text-xs font-medium bg-white/20 text-white"
              )}>
                {getPhaseLabel()}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <FocusSettings />
              <button
                onClick={() => navigate('/')}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
              >
                <Home className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>

          {/* Timer Display */}
          <div className="flex-1 flex flex-col items-center justify-center px-5">
            {/* Phase Indicator */}
            <div className="flex items-center gap-2 mb-6">
              {phase !== 'focus' && <Coffee className="w-5 h-5 text-white/80" />}
              <span className="text-white/80 text-sm font-medium">
                {phase === 'focus'
                  ? 'Time to focus!'
                  : 'Time to recharge!'
                }
              </span>
            </div>

            {/* Circular Timer */}
            <div className="relative w-72 h-72 mb-8">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-white/10"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="white"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 45}`}
                  strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
                  className="transition-all duration-1000"
                />
              </svg>

              {/* Timer text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-6xl font-bold text-white tracking-tight">
                  {formattedTimeLeft}
                </span>
                <span className="text-white/60 text-sm mt-2">
                  {phase === 'focus' ? 'Stay focused...' : 'Take a break...'}
                </span>
              </div>
            </div>
          </div>

          {/* Lumina Encouragement */}
          <div className="px-5 pb-8 safe-bottom">
            <div className="bg-white/10 rounded-2xl p-4 flex items-center gap-4">
              <LuminaAvatar size="sm" />
              <p className="text-sm text-white/80 flex-1">
                {phase === 'focus'
                  ? "You're doing amazing! Keep that focus going. I'm here if you need me."
                  : "Take this time to stretch, hydrate, and rest your eyes. You've earned it!"
                }
              </p>
            </div>
          </div>
        </div>
      </MobileLayout>
      <FocusModeDialog
        open={isDialogOpen}
        onOpenChange={actions.closeDialog}
        onConfirm={() => endSession('interrupted')}
        title="Exit Focus Mode?"
        description="Are you sure you want to end your focus session?"
        confirmText="Exit"
      />
    </>
  );
};

export default FocusView;
