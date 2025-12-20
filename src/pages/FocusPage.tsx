import React, { useState, useEffect, useCallback } from 'react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { LuminaAvatar } from '@/components/lumina/LuminaAvatar';
import { QuickTip } from '@/components/ui/quick-tip';
import { ArrowLeft, Play, Pause, RotateCcw, Volume2, Settings, Moon, Shield, Coffee, SkipForward, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { haptics } from '@/lib/haptics';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

type FocusMode = 'hard' | 'lite' | null;
type SessionPhase = 'focus' | 'shortBreak' | 'longBreak';

interface PomodoroSettings {
  focusDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  sessionsUntilLongBreak: number;
}

const defaultSettings: PomodoroSettings = {
  focusDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  sessionsUntilLongBreak: 4,
};

const FocusPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [mode, setMode] = useState<FocusMode>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [phase, setPhase] = useState<SessionPhase>('focus');
  const [completedSessions, setCompletedSessions] = useState(0);
  const [settings, setSettings] = useState<PomodoroSettings>(defaultSettings);
  const [showSettings, setShowSettings] = useState(false);
  
  // Calculate time based on current phase
  const getPhaseTime = useCallback(() => {
    switch (phase) {
      case 'focus':
        return settings.focusDuration * 60;
      case 'shortBreak':
        return settings.shortBreakDuration * 60;
      case 'longBreak':
        return settings.longBreakDuration * 60;
      default:
        return settings.focusDuration * 60;
    }
  }, [phase, settings]);

  const [timeLeft, setTimeLeft] = useState(getPhaseTime());
  const [totalTime, setTotalTime] = useState(getPhaseTime());

  // Update time when phase or settings change
  useEffect(() => {
    const newTime = getPhaseTime();
    setTimeLeft(newTime);
    setTotalTime(newTime);
  }, [phase, settings, getPhaseTime]);

  // Timer countdown
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (isRunning && timeLeft === 0) {
      handlePhaseComplete();
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft]);

  const handlePhaseComplete = async () => {
    haptics.success();
    setIsRunning(false);

    if (phase === 'focus') {
      const newCompletedSessions = completedSessions + 1;
      setCompletedSessions(newCompletedSessions);

      // Save session to database
      if (user) {
        await supabase.from('study_sessions').insert({
          user_id: user.id,
          title: `Focus Session - ${mode === 'hard' ? 'Hard' : 'Lite'} Mode`,
          duration_minutes: settings.focusDuration,
          mode: mode,
          completed: true,
          ended_at: new Date().toISOString(),
        });
      }

      // Determine next break type
      if (newCompletedSessions % settings.sessionsUntilLongBreak === 0) {
        setPhase('longBreak');
        toast({
          title: "Great work! 🎉",
          description: "You've earned a long break. Take 15 minutes to recharge!",
        });
      } else {
        setPhase('shortBreak');
        toast({
          title: "Session complete! ☕",
          description: "Take a 5 minute break before your next session.",
        });
      }
    } else {
      // Break is over, back to focus
      setPhase('focus');
      toast({
        title: "Break's over! 📚",
        description: "Ready to dive back in? Let's focus!",
      });
    }
  };

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const progress = ((totalTime - timeLeft) / totalTime) * 100;

  const handleStart = () => {
    haptics.medium();
    setIsRunning(true);
  };

  const handlePause = () => {
    haptics.light();
    setIsRunning(false);
  };

  const handleReset = () => {
    haptics.light();
    setIsRunning(false);
    setTimeLeft(getPhaseTime());
  };

  const handleSkipPhase = () => {
    haptics.medium();
    if (phase === 'focus') {
      handlePhaseComplete();
    } else {
      setPhase('focus');
      setIsRunning(false);
    }
  };

  const handleBackNavigation = () => {
    if (mode) {
      // If in a mode, go back to mode selection
      setMode(null);
      setIsRunning(false);
      setPhase('focus');
      setCompletedSessions(0);
    } else {
      // If on mode selection, go to home
      navigate('/');
    }
  };

  const getPhaseLabel = () => {
    switch (phase) {
      case 'focus':
        return 'Focus Time';
      case 'shortBreak':
        return 'Short Break';
      case 'longBreak':
        return 'Long Break';
    }
  };

  const getPhaseColor = () => {
    switch (phase) {
      case 'focus':
        return mode === 'hard' ? 'bg-primary' : 'bg-primary';
      case 'shortBreak':
        return 'bg-emerald-600';
      case 'longBreak':
        return 'bg-blue-600';
    }
  };

  // Mode Selection Screen
  if (!mode) {
    return (
      <MobileLayout showNav={false}>
        <div className="flex flex-col min-h-screen py-6 safe-top">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <button 
              onClick={handleBackNavigation}
              className="p-2 rounded-xl hover:bg-secondary transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <h1 className="text-lg font-semibold text-foreground">Deep Focus Mode</h1>
          </div>

          {/* Mode Selection */}
          <div className="flex-1 flex flex-col items-center justify-center">
            <LuminaAvatar size="xl" />
            <h2 className="text-2xl font-bold text-foreground mt-6 mb-2">Choose Your Focus Mode</h2>
            <p className="text-muted-foreground text-center mb-8">
              Let Lumina help you stay concentrated
            </p>

            <div className="w-full space-y-4">
              <button
                onClick={() => setMode('hard')}
                className="w-full bg-card rounded-2xl p-5 border border-border/50 shadow-card text-left hover:shadow-premium hover:border-primary/30 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center">
                    <Shield className="w-7 h-7 text-primary-foreground" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-foreground text-lg">Hard Mode</h3>
                    <p className="text-sm text-muted-foreground">
                      Maximum focus with Pomodoro timer
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {['25min Focus', '5min Breaks', 'Long Breaks'].map((feature) => (
                    <span key={feature} className="px-3 py-1 bg-destructive/10 text-destructive text-xs rounded-full">
                      {feature}
                    </span>
                  ))}
                </div>
              </button>

              <button
                onClick={() => setMode('lite')}
                className="w-full bg-card rounded-2xl p-5 border border-border/50 shadow-card text-left hover:shadow-premium hover:border-primary/30 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Moon className="w-7 h-7 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-foreground text-lg">Lite Mode</h3>
                    <p className="text-sm text-muted-foreground">
                      Gentle focus with flexible timing
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {['Flexible Duration', 'Ambient Sounds', 'Gentle Alerts'].map((feature) => (
                    <span key={feature} className="px-3 py-1 bg-primary/10 text-primary text-xs rounded-full">
                      {feature}
                    </span>
                  ))}
                </div>
              </button>
            </div>

            {/* Quick Tip */}
            <QuickTip tipId="focus_modes" className="w-full mt-6" position="bottom" />
          </div>
        </div>
      </MobileLayout>
    );
  }

  // Timer Screen
  return (
    <MobileLayout showNav={false}>
      <div className={cn("flex flex-col min-h-screen transition-colors duration-500", getPhaseColor())}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-6 safe-top">
          <button 
            onClick={handleBackNavigation}
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
            {phase === 'focus' && (
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-white/10 text-white/80">
                Session {completedSessions + 1}
              </span>
            )}
          </div>
          <button 
            onClick={() => navigate('/')}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
          >
            <Home className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Timer Display */}
        <div className="flex-1 flex flex-col items-center justify-center px-5">
          {/* Phase Indicator */}
          <div className="flex items-center gap-2 mb-6">
            {phase !== 'focus' && <Coffee className="w-5 h-5 text-white/80" />}
            <span className="text-white/80 text-sm font-medium">
              {phase === 'focus' 
                ? `${settings.sessionsUntilLongBreak - (completedSessions % settings.sessionsUntilLongBreak)} sessions until long break`
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
                {formatTime(timeLeft)}
              </span>
              <span className="text-white/60 text-sm mt-2">
                {isRunning ? 'Stay focused...' : 'Ready to begin'}
              </span>
            </div>
          </div>

          {/* Session Progress Dots */}
          <div className="flex gap-2 mb-8">
            {Array.from({ length: settings.sessionsUntilLongBreak }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "w-3 h-3 rounded-full transition-all",
                  i < (completedSessions % settings.sessionsUntilLongBreak)
                    ? "bg-white"
                    : i === (completedSessions % settings.sessionsUntilLongBreak) && phase === 'focus'
                      ? "bg-white/50 animate-pulse"
                      : "bg-white/20"
                )}
              />
            ))}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-4">
            <button 
              onClick={handleReset}
              className="p-4 rounded-2xl bg-white/10 hover:bg-white/20 transition-colors"
            >
              <RotateCcw className="w-6 h-6 text-white" />
            </button>
            <button
              onClick={() => isRunning ? handlePause() : handleStart()}
              className="w-20 h-20 rounded-full bg-white shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
            >
              {isRunning ? (
                <Pause className="w-8 h-8 text-primary" />
              ) : (
                <Play className="w-8 h-8 text-primary ml-1" />
              )}
            </button>
            <button 
              onClick={handleSkipPhase}
              className="p-4 rounded-2xl bg-white/10 hover:bg-white/20 transition-colors"
            >
              <SkipForward className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>

        {/* Lumina Encouragement */}
        <div className="px-5 pb-8 safe-bottom">
          <div className="bg-white/10 rounded-2xl p-4 flex items-center gap-4">
            <LuminaAvatar size="sm" />
            <p className="text-sm text-white/80 flex-1">
              {phase === 'focus' 
                ? isRunning 
                  ? "You're doing amazing! Keep that focus going. I'm here if you need me."
                  : "Ready to enter deep focus? I'll keep distractions at bay for you."
                : "Take this time to stretch, hydrate, and rest your eyes. You've earned it!"
              }
            </p>
          </div>
        </div>
      </div>
    </MobileLayout>
  );
};

export default FocusPage;
