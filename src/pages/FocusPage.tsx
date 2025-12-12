import React, { useState, useEffect, useCallback } from 'react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { LuminaAvatar } from '@/components/lumina/LuminaAvatar';
import { ArrowLeft, Play, Pause, RotateCcw, Volume2, Settings, Moon, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

type FocusMode = 'hard' | 'lite' | null;

const FocusPage: React.FC = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<FocusMode>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes in seconds
  const [selectedDuration, setSelectedDuration] = useState(25);

  const durations = [15, 25, 45, 60, 90];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft]);

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const progress = ((selectedDuration * 60 - timeLeft) / (selectedDuration * 60)) * 100;

  const handleStart = () => {
    setTimeLeft(selectedDuration * 60);
    setIsRunning(true);
  };

  const handleReset = () => {
    setIsRunning(false);
    setTimeLeft(selectedDuration * 60);
  };

  if (!mode) {
    return (
      <MobileLayout showNav={false}>
        <div className="flex flex-col min-h-screen px-5 py-6 safe-top">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <button 
              onClick={() => navigate(-1)}
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
                      Blocks distracting apps & notifications
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {['Social Media', 'Games', 'Entertainment'].map((app) => (
                    <span key={app} className="px-3 py-1 bg-destructive/10 text-destructive text-xs rounded-full">
                      {app}
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
                      Activates DND with gentle reminders
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {['Do Not Disturb', 'Ambient Sounds', 'Gentle Alerts'].map((feature) => (
                    <span key={feature} className="px-3 py-1 bg-primary/10 text-primary text-xs rounded-full">
                      {feature}
                    </span>
                  ))}
                </div>
              </button>
            </div>
          </div>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout showNav={false}>
      <div className="flex flex-col min-h-screen bg-lmv-blue-900">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-6 safe-top">
          <button 
            onClick={() => setMode(null)}
            className="p-2 rounded-xl bg-primary-foreground/10 hover:bg-primary-foreground/20 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-primary-foreground" />
          </button>
          <div className="flex items-center gap-2">
            <span className={cn(
              "px-3 py-1 rounded-full text-xs font-medium",
              mode === 'hard' 
                ? "bg-destructive/20 text-destructive" 
                : "bg-primary/20 text-primary"
            )}>
              {mode === 'hard' ? 'Hard Mode' : 'Lite Mode'}
            </span>
          </div>
          <button className="p-2 rounded-xl bg-primary-foreground/10 hover:bg-primary-foreground/20 transition-colors">
            <Settings className="w-5 h-5 text-primary-foreground" />
          </button>
        </div>

        {/* Timer Display */}
        <div className="flex-1 flex flex-col items-center justify-center px-5">
          {/* Circular Timer */}
          <div className="relative w-72 h-72 mb-8">
            {/* Background circle */}
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-primary-foreground/10"
              />
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="url(#gradient)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 45}`}
                strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
                className="transition-all duration-1000"
              />
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#3B82F6" />
                  <stop offset="100%" stopColor="#1E40AF" />
                </linearGradient>
              </defs>
            </svg>
            
            {/* Timer text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-6xl font-bold text-primary-foreground tracking-tight">
                {formatTime(timeLeft)}
              </span>
              <span className="text-primary-foreground/60 text-sm mt-2">
                {isRunning ? 'Stay focused...' : 'Ready to begin'}
              </span>
            </div>
          </div>

          {/* Duration Selection */}
          {!isRunning && (
            <div className="flex gap-2 mb-8">
              {durations.map((duration) => (
                <button
                  key={duration}
                  onClick={() => {
                    setSelectedDuration(duration);
                    setTimeLeft(duration * 60);
                  }}
                  className={cn(
                    "px-4 py-2 rounded-xl text-sm font-medium transition-all",
                    selectedDuration === duration
                      ? "bg-primary text-primary-foreground"
                      : "bg-primary-foreground/10 text-primary-foreground/70 hover:bg-primary-foreground/20"
                  )}
                >
                  {duration}m
                </button>
              ))}
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center gap-4">
            <button 
              onClick={handleReset}
              className="p-4 rounded-2xl bg-primary-foreground/10 hover:bg-primary-foreground/20 transition-colors"
            >
              <RotateCcw className="w-6 h-6 text-primary-foreground" />
            </button>
            <button
              onClick={() => isRunning ? setIsRunning(false) : handleStart()}
              className="w-20 h-20 rounded-full gradient-primary shadow-glow flex items-center justify-center hover:scale-105 transition-transform"
            >
              {isRunning ? (
                <Pause className="w-8 h-8 text-primary-foreground" />
              ) : (
                <Play className="w-8 h-8 text-primary-foreground ml-1" />
              )}
            </button>
            <button className="p-4 rounded-2xl bg-primary-foreground/10 hover:bg-primary-foreground/20 transition-colors">
              <Volume2 className="w-6 h-6 text-primary-foreground" />
            </button>
          </div>
        </div>

        {/* Lumina Encouragement */}
        <div className="px-5 pb-8 safe-bottom">
          <div className="bg-primary-foreground/10 rounded-2xl p-4 flex items-center gap-4">
            <LuminaAvatar size="sm" />
            <p className="text-sm text-primary-foreground/80 flex-1">
              {isRunning 
                ? "You're doing amazing! Keep that focus going. I'm here if you need me."
                : "Ready to enter deep focus? I'll keep distractions at bay for you."
              }
            </p>
          </div>
        </div>
      </div>
    </MobileLayout>
  );
};

export default FocusPage;