import React, { useEffect, useState } from 'react';
import { Shield, Lock, Brain, Sparkles } from 'lucide-react';
import { useFocusSession, useFocusSessionStore } from './useFocusSession';
import { LuminaAvatar } from '@/components/lumina/LuminaAvatar';
import { cn } from '@/lib/utils';
import { FocusModeDialog } from './FocusModeDialog';

const motivationalQuotes = [
  "Deep work is like a superpower in our increasingly competitive economy.",
  "The ability to concentrate without distraction is becoming increasingly valuable.",
  "Focus on being productive instead of busy.",
  "Where focus goes, energy flows.",
  "Concentrate all your thoughts upon the work at hand.",
  "The successful warrior is the average person with laser-like focus.",
  "Stay committed to your decisions, but stay flexible in your approach.",
  "Don't watch the clock; do what it does. Keep going.",
];

export const HardModeOverlay: React.FC = () => {
  const { isActive, phase, settings, formattedTimeLeft, endSession } = useFocusSession();
  const { isDialogOpen, actions } = useFocusSessionStore(state => ({
    isDialogOpen: state.isDialogOpen,
    actions: state.actions,
  }));
  
  const [currentQuote, setCurrentQuote] = useState(0);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Rotate quotes every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentQuote(prev => (prev + 1) % motivationalQuotes.length);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Prevent navigation
  useEffect(() => {
    if (!isActive || settings.mode !== 'hard') return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'You are in Hard Mode. Are you sure you want to leave?';
      return e.returnValue;
    };

    const handlePopState = (e: PopStateEvent) => {
      e.preventDefault();
      window.history.pushState(null, '', window.location.href);
      setShowExitConfirm(true);
    };

    // Push a state to prevent back navigation
    window.history.pushState(null, '', window.location.href);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);

    // Block keyboard shortcuts for navigation
    const handleKeyDown = (e: KeyboardEvent) => {
      // Block common navigation shortcuts
      if (
        (e.ctrlKey && (e.key === 'w' || e.key === 't' || e.key === 'n')) ||
        (e.altKey && (e.key === 'Tab' || e.key === 'F4')) ||
        e.key === 'F5' ||
        (e.ctrlKey && e.key === 'r')
      ) {
        e.preventDefault();
        setShowExitConfirm(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isActive, settings.mode]);

  if (!isActive || settings.mode !== 'hard') {
    return null;
  }

  return (
    <>
      <div className="fixed inset-0 z-[100] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center overflow-hidden">
        {/* Animated background effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 -left-20 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        {/* Lock indicator */}
        <div className="absolute top-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/10">
          <Lock className="w-4 h-4 text-white/60" />
          <span className="text-xs font-medium text-white/60">Hard Mode Active</span>
        </div>

        {/* Main content */}
        <div className="relative z-10 flex flex-col items-center px-6 max-w-md mx-auto">
          {/* Phase indicator */}
          <div className={cn(
            "px-4 py-2 rounded-full text-sm font-medium mb-8 flex items-center gap-2",
            phase === 'focus' 
              ? "bg-primary/20 text-primary" 
              : "bg-emerald-500/20 text-emerald-400"
          )}>
            {phase === 'focus' ? (
              <>
                <Brain className="w-4 h-4" />
                Focus Time
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Break Time
              </>
            )}
          </div>

          {/* Goal display */}
          {settings.goal && (
            <div className="mb-6 px-4 py-2 bg-white/5 rounded-xl border border-white/10 max-w-full">
              <p className="text-white/70 text-sm text-center truncate">{settings.goal}</p>
            </div>
          )}

          {/* Timer */}
          <div className="mb-8">
            <div className="text-8xl font-bold text-white tracking-tight font-mono">
              {formattedTimeLeft}
            </div>
          </div>

          {/* Lumina avatar and message */}
          <div className="flex flex-col items-center gap-4 mb-8">
            <LuminaAvatar size="lg" />
            <p className="text-white/60 text-center text-sm max-w-xs animate-fade-in" key={currentQuote}>
              "{motivationalQuotes[currentQuote]}"
            </p>
          </div>

          {/* Shield indicator */}
          <div className="flex items-center gap-3 px-5 py-3 bg-white/5 rounded-2xl border border-white/10">
            <Shield className="w-5 h-5 text-primary" />
            <span className="text-white/70 text-sm">Distractions blocked. Stay focused.</span>
          </div>
        </div>

        {/* Exit button - subtle at bottom */}
        <button
          onClick={() => setShowExitConfirm(true)}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 px-4 py-2 text-white/30 text-xs hover:text-white/50 transition-colors"
        >
          Need to exit? Tap here
        </button>
      </div>

      {/* Exit confirmation dialog */}
      <FocusModeDialog
        open={showExitConfirm}
        onOpenChange={setShowExitConfirm}
        onConfirm={() => {
          endSession('interrupted');
          setShowExitConfirm(false);
        }}
        title="Exit Hard Mode?"
        description="You're making great progress! Are you sure you want to end your focus session early? Your streak will be interrupted."
        confirmText="Exit Session"
        cancelText="Keep Focusing"
      />
    </>
  );
};
