import React, { useState } from 'react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { LuminaAvatar } from '@/components/lumina/LuminaAvatar';
import { ArrowLeft, Play, Coffee, Home, Shield, Sparkles, Clock, Target, Zap, Timer } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useFocusSession, useFocusSessionStore, SESSION_PRESETS, FocusMode } from './useFocusSession';
import { FocusSettings } from './FocusSettings';
import { FocusModeDialog } from './FocusModeDialog';
import { HardModeOverlay } from './HardModeOverlay';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const FocusView: React.FC = () => {
  const navigate = useNavigate();
  const {
    isActive,
    phase,
    timeLeft,
    settings,
    startSession,
    endSession,
    updateSettings,
    formattedTimeLeft,
  } = useFocusSession();
  const { isDialogOpen, actions } = useFocusSessionStore(state => ({
    isDialogOpen: state.isDialogOpen,
    actions: state.actions,
  }));

  const [selectedMode, setSelectedMode] = useState<FocusMode>(settings.mode);
  const [selectedPreset, setSelectedPreset] = useState<string>(settings.presetId || 'standard');
  const [goal, setGoal] = useState(settings.goal);

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

  const handleStartSession = () => {
    const preset = SESSION_PRESETS.find(p => p.id === selectedPreset);
    startSession({
      mode: selectedMode,
      goal: goal,
      presetId: selectedPreset,
      focusDuration: preset?.focusDuration || 50 * 60,
      breakDuration: preset?.breakDuration || 10 * 60,
    });
  };

  const handleModeSelect = (mode: FocusMode) => {
    setSelectedMode(mode);
  };

  const handlePresetSelect = (presetId: string) => {
    setSelectedPreset(presetId);
  };

  if (!isActive) {
    return (
      <MobileLayout showNav={false}>
        <div className="flex flex-col min-h-screen py-6 safe-top">
          {/* Header */}
          <div className="flex items-center justify-between gap-4 mb-6">
            <button
              onClick={() => navigate('/')}
              className="p-2 rounded-xl hover:bg-secondary transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <h1 className="text-lg font-semibold text-foreground">Deep Focus Mode</h1>
            <FocusSettings />
          </div>

          {/* Avatar and Greeting */}
          <div className="flex flex-col items-center mb-6">
            <LuminaAvatar size="lg" />
            <h2 className="text-xl font-bold text-foreground mt-4 mb-1">Ready to Focus?</h2>
            <p className="text-muted-foreground text-center text-sm">
              Configure your session and start focusing
            </p>
          </div>

          {/* Goal Input */}
          <div className="mb-6">
            <Label htmlFor="goal" className="text-sm font-medium text-foreground mb-2 block">
              What are you working on?
            </Label>
            <div className="relative">
              <Target className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="goal"
                placeholder="e.g., Study Constitutional Law Chapter 5"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Mode Selection */}
          <div className="mb-6">
            <Label className="text-sm font-medium text-foreground mb-3 block">
              Select Focus Mode
            </Label>
            <div className="grid grid-cols-2 gap-3">
              {/* Lite Mode */}
              <button
                onClick={() => handleModeSelect('lite')}
                className={cn(
                  "relative p-4 rounded-2xl border-2 text-left transition-all",
                  selectedMode === 'lite'
                    ? "border-primary bg-primary/5 shadow-md"
                    : "border-border bg-card hover:border-primary/50"
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={cn(
                    "w-8 h-8 rounded-xl flex items-center justify-center",
                    selectedMode === 'lite' ? "bg-primary/20" : "bg-muted"
                  )}>
                    <Sparkles className={cn(
                      "w-4 h-4",
                      selectedMode === 'lite' ? "text-primary" : "text-muted-foreground"
                    )} />
                  </div>
                  <span className="font-semibold text-foreground">Lite Mode</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Gentle reminders, can navigate freely
                </p>
                {selectedMode === 'lite' && (
                  <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary animate-pulse" />
                )}
              </button>

              {/* Hard Mode */}
              <button
                onClick={() => handleModeSelect('hard')}
                className={cn(
                  "relative p-4 rounded-2xl border-2 text-left transition-all",
                  selectedMode === 'hard'
                    ? "border-destructive bg-destructive/5 shadow-md"
                    : "border-border bg-card hover:border-destructive/50"
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={cn(
                    "w-8 h-8 rounded-xl flex items-center justify-center",
                    selectedMode === 'hard' ? "bg-destructive/20" : "bg-muted"
                  )}>
                    <Shield className={cn(
                      "w-4 h-4",
                      selectedMode === 'hard' ? "text-destructive" : "text-muted-foreground"
                    )} />
                  </div>
                  <span className="font-semibold text-foreground">Hard Mode</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Fullscreen lock, no distractions
                </p>
                {selectedMode === 'hard' && (
                  <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-destructive animate-pulse" />
                )}
              </button>
            </div>
          </div>

          {/* Session Presets */}
          <div className="mb-8">
            <Label className="text-sm font-medium text-foreground mb-3 block">
              Session Duration
            </Label>
            <div className="space-y-2">
              {SESSION_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handlePresetSelect(preset.id)}
                  className={cn(
                    "w-full p-4 rounded-xl border-2 flex items-center gap-4 transition-all",
                    selectedPreset === preset.id
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card hover:border-primary/30"
                  )}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center",
                    selectedPreset === preset.id ? "bg-primary/20" : "bg-muted"
                  )}>
                    {preset.id === 'quick' && <Zap className={cn("w-5 h-5", selectedPreset === preset.id ? "text-primary" : "text-muted-foreground")} />}
                    {preset.id === 'standard' && <Clock className={cn("w-5 h-5", selectedPreset === preset.id ? "text-primary" : "text-muted-foreground")} />}
                    {preset.id === 'deep' && <Timer className={cn("w-5 h-5", selectedPreset === preset.id ? "text-primary" : "text-muted-foreground")} />}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-semibold text-foreground">{preset.name}</div>
                    <div className="text-xs text-muted-foreground">{preset.description}</div>
                  </div>
                  {selectedPreset === preset.id && (
                    <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-primary-foreground" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Start Button */}
          <button
            onClick={handleStartSession}
            className="w-full gradient-primary rounded-2xl p-5 flex items-center justify-center gap-3 shadow-premium hover:opacity-90 transition-opacity"
          >
            <Play className="w-6 h-6 text-primary-foreground" />
            <span className="font-bold text-lg text-primary-foreground">Start Focus Session</span>
          </button>
        </div>
      </MobileLayout>
    );
  }

  // Timer Screen
  return (
    <>
      {/* Hard Mode Overlay */}
      {settings.mode === 'hard' && <HardModeOverlay />}
      
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
              {settings.mode === 'hard' && (
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-white/20 text-white flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  Hard Mode
                </span>
              )}
              <span className={cn(
                "px-3 py-1 rounded-full text-xs font-medium bg-white/20 text-white"
              )}>
                {getPhaseLabel()}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {settings.mode !== 'hard' && (
                <>
                  <FocusSettings />
                  <button
                    onClick={() => navigate('/')}
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
                  >
                    <Home className="w-5 h-5 text-white" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Goal Display */}
          {settings.goal && (
            <div className="mx-5 mb-4 px-4 py-2 bg-white/10 rounded-xl">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-white/70" />
                <span className="text-white/90 text-sm font-medium truncate">{settings.goal}</span>
              </div>
            </div>
          )}

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
        description={settings.mode === 'hard' 
          ? "You're in Hard Mode. Are you sure you want to end your focus session early?"
          : "Are you sure you want to end your focus session?"
        }
        confirmText="Exit"
      />
    </>
  );
};

export default FocusView;
