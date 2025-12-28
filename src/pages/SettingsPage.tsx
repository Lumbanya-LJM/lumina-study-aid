import React, { useState, useEffect } from 'react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { LMVLogo } from '@/components/ui/lmv-logo';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useSoundNotifications } from '@/hooks/useSoundNotifications';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { useQuickTips } from '@/hooks/useQuickTips';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { 
  ArrowLeft,
  Bell,
  Target,
  Palette,
  Save,
  Clock,
  BookOpen,
  Brain,
  Moon,
  Sun,
  Monitor,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Shield,
  Lock,
  Mail,
  Eye,
  EyeOff,
  Download,
  Wifi,
  WifiOff,
  Volume2,
  VolumeX,
  Globe,
  Sparkles,
  Lightbulb,
  RotateCcw,
  ShoppingBag
} from 'lucide-react';
import MyPurchasesSection from '@/components/settings/MyPurchasesSection';
import { cn } from '@/lib/utils';

interface NotificationSettings {
  dailyReminders: boolean;
  weeklyReports: boolean;
  studyStreak: boolean;
  quizReminders: boolean;
  partnerUpdates: boolean;
}

interface StudyGoals {
  dailyStudyHours: number;
  weeklyTaskTarget: number;
  flashcardsPerDay: number;
  quizzesPerWeek: number;
}



const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const pushNotifications = usePushNotifications();
  const soundNotifications = useSoundNotifications();
  const offlineSync = useOfflineSync();
  const { resetAllTips, seenTips } = useQuickTips();
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'purchases' | 'notifications' | 'goals' | 'lumina' | 'appearance' | 'offline' | 'security'>('purchases');
  
  // Email change state
  const [newEmail, setNewEmail] = useState('');
  const [changingEmail, setChangingEmail] = useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // Notification settings
  const [notifications, setNotifications] = useState<NotificationSettings>({
    dailyReminders: true,
    weeklyReports: true,
    studyStreak: true,
    quizReminders: true,
    partnerUpdates: true,
  });

  // Study goals
  const [goals, setGoals] = useState<StudyGoals>({
    dailyStudyHours: 4,
    weeklyTaskTarget: 20,
    flashcardsPerDay: 30,
    quizzesPerWeek: 5,
  });

  // Load settings from localStorage
  useEffect(() => {
    const savedNotifications = localStorage.getItem('luminary_notifications');
    const savedGoals = localStorage.getItem('luminary_goals');

    if (savedNotifications) {
      setNotifications(JSON.parse(savedNotifications));
    }
    if (savedGoals) {
      setGoals(JSON.parse(savedGoals));
    }
  }, []);

  const handleSave = () => {
    setSaving(true);
    
    // Save to localStorage
    localStorage.setItem('luminary_notifications', JSON.stringify(notifications));
    localStorage.setItem('luminary_goals', JSON.stringify(goals));

    setTimeout(() => {
      setSaving(false);
      toast({
        title: "Settings Saved",
        description: "Your preferences have been updated.",
      });
    }, 500);
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Passwords Don't Match",
        description: "Please make sure both passwords are the same.",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        variant: "destructive",
        title: "Password Too Short",
        description: "New password must be at least 6 characters long.",
      });
      return;
    }

    setChangingPassword(true);

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });

      if (error) {
        toast({
          variant: "destructive",
          title: "Failed to Change Password",
          description: error.message,
        });
      } else {
        toast({
          title: "Password Changed",
          description: "Your password has been updated successfully.",
        });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Something went wrong. Please try again.",
      });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleChangeEmail = async () => {
    if (!newEmail || !newEmail.includes('@')) {
      toast({
        variant: "destructive",
        title: "Invalid Email",
        description: "Please enter a valid email address.",
      });
      return;
    }

    setChangingEmail(true);

    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail });

      if (error) {
        toast({
          variant: "destructive",
          title: "Failed to Update Email",
          description: error.message,
        });
      } else {
        toast({
          title: "Verification Email Sent",
          description: "Please check your new email address to confirm the change.",
        });
        setNewEmail('');
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Something went wrong. Please try again.",
      });
    } finally {
      setChangingEmail(false);
    }
  };

  const tabs = [
    { id: 'purchases' as const, label: 'Purchases', icon: ShoppingBag },
    { id: 'notifications' as const, label: 'Notifications', icon: Bell },
    { id: 'goals' as const, label: 'Goals', icon: Target },
    { id: 'lumina' as const, label: 'Lumina', icon: Sparkles },
    { id: 'appearance' as const, label: 'Appearance', icon: Palette },
    { id: 'offline' as const, label: 'Offline', icon: Download },
    { id: 'security' as const, label: 'Security', icon: Shield },
  ];

  // Lumina settings
  const [deepSearchDefault, setDeepSearchDefault] = useState(() => {
    const saved = localStorage.getItem('lumina_deep_search_default');
    return saved === 'true';
  });

  const [luminaSoundsEnabled, setLuminaSoundsEnabled] = useState(() => {
    const saved = localStorage.getItem('lumina_sounds_enabled');
    return saved === 'true'; // Default to OFF (false)
  });

  const notificationOptions = [
    { key: 'dailyReminders' as const, label: 'Daily Study Reminders', description: 'Get reminded to study every day' },
    { key: 'weeklyReports' as const, label: 'Weekly Progress Reports', description: 'Receive weekly summary of your progress' },
    { key: 'studyStreak' as const, label: 'Streak Notifications', description: 'Alerts to maintain your study streak' },
    { key: 'quizReminders' as const, label: 'Quiz & Flashcard Reminders', description: 'Scheduled review reminders' },
    { key: 'partnerUpdates' as const, label: 'Accountability Partner Updates', description: 'Updates from your study partners' },
  ];

  const themeOptions = [
    { value: 'light' as const, label: 'Light', icon: Sun },
    { value: 'dark' as const, label: 'Dark', icon: Moon },
    { value: 'system' as const, label: 'System', icon: Monitor },
  ];

  return (
    <MobileLayout showNav={false}>
      <div className="py-6 safe-top pb-24">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-xl font-bold text-foreground">Settings</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm whitespace-nowrap transition-all",
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground shadow-glow"
                  : "bg-secondary text-muted-foreground hover:bg-secondary/80"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="space-y-6">
          {/* Purchases Tab */}
          {activeTab === 'purchases' && (
            <MyPurchasesSection />
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <>
              {/* Push Notifications Card */}
              <div className="bg-card rounded-2xl border border-border/50 shadow-card p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-xl bg-primary/10">
                    <Smartphone className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h2 className="font-semibold text-foreground">Push Notifications</h2>
                    <p className="text-xs text-muted-foreground">Receive notifications on this device</p>
                  </div>
                </div>

                {!pushNotifications.isSupported ? (
                  <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-xl">
                    <AlertCircle className="w-5 h-5 text-destructive" />
                    <p className="text-sm text-destructive">Push notifications are not supported in this browser</p>
                  </div>
                ) : pushNotifications.isSubscribed ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-xl">
                      <CheckCircle2 className="w-5 h-5 text-primary" />
                      <p className="text-sm text-primary font-medium">Push notifications are enabled</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          await pushNotifications.sendTestNotification();
                          toast({
                            title: "Test Sent",
                            description: "Check your notifications!",
                          });
                        }}
                        className="flex-1"
                      >
                        Send Test
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={async () => {
                          const success = await pushNotifications.unsubscribe();
                          if (success) {
                            toast({
                              title: "Unsubscribed",
                              description: "Push notifications have been disabled.",
                            });
                          }
                        }}
                        disabled={pushNotifications.loading}
                        className="flex-1"
                      >
                        Disable
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Enable push notifications to receive study reminders and updates even when the app is closed.
                    </p>
                    <Button
                      onClick={async () => {
                        const success = await pushNotifications.subscribe();
                        if (success) {
                          toast({
                            title: "Subscribed!",
                            description: "You'll now receive push notifications.",
                          });
                        } else if (pushNotifications.error) {
                          toast({
                            variant: "destructive",
                            title: "Failed",
                            description: pushNotifications.error,
                          });
                        }
                      }}
                      disabled={pushNotifications.loading}
                      className="w-full"
                    >
                      {pushNotifications.loading ? (
                        <span className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                          Enabling...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <Bell className="w-4 h-4" />
                          Enable Push Notifications
                        </span>
                      )}
                    </Button>
                  </div>
                )}
              </div>

              {/* Sound Notifications Card */}
              <div className="bg-card rounded-2xl border border-border/50 shadow-card p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-xl bg-primary/10">
                    {soundNotifications.isEnabled ? (
                      <Volume2 className="w-5 h-5 text-primary" />
                    ) : (
                      <VolumeX className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h2 className="font-semibold text-foreground">Sound Notifications</h2>
                    <p className="text-xs text-muted-foreground">Play sounds for class starts and updates</p>
                  </div>
                  <Switch
                    checked={soundNotifications.isEnabled}
                    onCheckedChange={() => {
                      const newState = soundNotifications.toggleSound();
                      toast({
                        title: newState ? "Sounds Enabled" : "Sounds Disabled",
                        description: newState 
                          ? "You'll hear sounds for important events" 
                          : "Sound notifications are now muted",
                      });
                    }}
                  />
                </div>
                
                {soundNotifications.isEnabled && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      await soundNotifications.playTestSound();
                      toast({
                        title: "Sound Test",
                        description: "Did you hear that?",
                      });
                    }}
                    className="w-full"
                  >
                    <Volume2 className="w-4 h-4 mr-2" />
                    Test Sound
                  </Button>
                )}
              </div>

              {/* Notification Preferences Card */}
              <div className="bg-card rounded-2xl border border-border/50 shadow-card p-5 space-y-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-xl bg-primary/10">
                    <Bell className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-foreground">Notification Types</h2>
                    <p className="text-xs text-muted-foreground">Choose what to be notified about</p>
                  </div>
                </div>

                {notificationOptions.map((option) => (
                  <div 
                    key={option.key}
                    className="flex items-center justify-between py-3 border-b border-border/50 last:border-0"
                  >
                    <div className="flex-1 pr-4">
                      <p className="font-medium text-sm text-foreground">{option.label}</p>
                      <p className="text-xs text-muted-foreground">{option.description}</p>
                    </div>
                    <Switch
                      checked={notifications[option.key]}
                      onCheckedChange={(checked) => 
                        setNotifications(prev => ({ ...prev, [option.key]: checked }))
                      }
                    />
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Study Goals Tab */}
          {activeTab === 'goals' && (
            <div className="bg-card rounded-2xl border border-border/50 shadow-card p-5 space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-xl bg-primary/10">
                  <Target className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-semibold text-foreground">Study Goals</h2>
                  <p className="text-xs text-muted-foreground">Set your daily and weekly targets</p>
                </div>
              </div>

              {/* Daily Study Hours */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    <Label className="text-sm font-medium">Daily Study Hours</Label>
                  </div>
                  <span className="text-lg font-bold text-primary">{goals.dailyStudyHours}h</span>
                </div>
                <Slider
                  value={[goals.dailyStudyHours]}
                  onValueChange={([value]) => setGoals(prev => ({ ...prev, dailyStudyHours: value }))}
                  max={12}
                  min={1}
                  step={0.5}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">Recommended: 4-6 hours for optimal retention</p>
              </div>

              {/* Weekly Task Target */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-primary" />
                    <Label className="text-sm font-medium">Weekly Tasks Target</Label>
                  </div>
                  <span className="text-lg font-bold text-primary">{goals.weeklyTaskTarget}</span>
                </div>
                <Slider
                  value={[goals.weeklyTaskTarget]}
                  onValueChange={([value]) => setGoals(prev => ({ ...prev, weeklyTaskTarget: value }))}
                  max={50}
                  min={5}
                  step={5}
                  className="w-full"
                />
              </div>

              {/* Flashcards Per Day */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Brain className="w-4 h-4 text-primary" />
                    <Label className="text-sm font-medium">Flashcards Per Day</Label>
                  </div>
                  <span className="text-lg font-bold text-primary">{goals.flashcardsPerDay}</span>
                </div>
                <Slider
                  value={[goals.flashcardsPerDay]}
                  onValueChange={([value]) => setGoals(prev => ({ ...prev, flashcardsPerDay: value }))}
                  max={100}
                  min={10}
                  step={5}
                  className="w-full"
                />
              </div>

              {/* Quizzes Per Week */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-primary" />
                    <Label className="text-sm font-medium">Quizzes Per Week</Label>
                  </div>
                  <span className="text-lg font-bold text-primary">{goals.quizzesPerWeek}</span>
                </div>
                <Slider
                  value={[goals.quizzesPerWeek]}
                  onValueChange={([value]) => setGoals(prev => ({ ...prev, quizzesPerWeek: value }))}
                  max={20}
                  min={1}
                  step={1}
                  className="w-full"
                />
              </div>
            </div>
          )}

          {/* Lumina Settings Tab */}
          {activeTab === 'lumina' && (
            <div className="space-y-6">
              {/* Deep Search Settings */}
              <div className="bg-card rounded-2xl border border-border/50 shadow-card p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-xl bg-primary/10">
                    <Globe className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h2 className="font-semibold text-foreground">Deep Search Mode</h2>
                    <p className="text-xs text-muted-foreground">Let Lumina search the web for answers</p>
                  </div>
                  <Switch
                    checked={deepSearchDefault}
                    onCheckedChange={(checked) => {
                      setDeepSearchDefault(checked);
                      localStorage.setItem('lumina_deep_search_default', String(checked));
                      toast({
                        title: checked ? "Deep Search Enabled" : "Deep Search Disabled",
                        description: checked 
                          ? "Lumina will search the web by default" 
                          : "Lumina will use only its knowledge base",
                      });
                    }}
                  />
                </div>
                
                <div className="p-3 bg-secondary/50 rounded-xl">
                  <p className="text-xs text-muted-foreground">
                    When enabled, Lumina will search the internet for current information, 
                    ZambiaLII cases, and statutes to provide more accurate and up-to-date answers.
                    You can also toggle this per-conversation in the chat header.
                  </p>
                </div>
              </div>

              {/* Lumina Sounds Settings */}
              <div className="bg-card rounded-2xl border border-border/50 shadow-card p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-xl bg-primary/10">
                    {luminaSoundsEnabled ? (
                      <Volume2 className="w-5 h-5 text-primary" />
                    ) : (
                      <VolumeX className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h2 className="font-semibold text-foreground">Lumina Sound Effects</h2>
                    <p className="text-xs text-muted-foreground">Play sounds for typing and task completion</p>
                  </div>
                  <Switch
                    checked={luminaSoundsEnabled}
                    onCheckedChange={(checked) => {
                      setLuminaSoundsEnabled(checked);
                      localStorage.setItem('lumina_sounds_enabled', String(checked));
                      toast({
                        title: checked ? "Lumina Sounds Enabled" : "Lumina Sounds Disabled",
                        description: checked 
                          ? "You'll hear sounds when Lumina types and completes tasks" 
                          : "Lumina will work silently",
                      });
                    }}
                  />
                </div>
                
                <div className="p-3 bg-secondary/50 rounded-xl">
                  <p className="text-xs text-muted-foreground">
                    Includes subtle typing sounds as Lumina generates responses 
                    and completion sounds when study materials are created.
                  </p>
                </div>
              </div>

              {/* LuminaVault Link */}
              <button
                onClick={() => navigate('/locker')}
                className="w-full bg-card rounded-2xl border border-border/50 shadow-card p-5 flex items-center gap-4 hover:border-primary/30 transition-colors"
              >
                <div className="p-2 rounded-xl bg-primary/10">
                  <Lock className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 text-left">
                  <h2 className="font-semibold text-foreground">LuminaVault</h2>
                  <p className="text-xs text-muted-foreground">Your personal study file vault</p>
                </div>
                <ArrowLeft className="w-5 h-5 text-muted-foreground rotate-180" />
              </button>

              {/* Reset Quick Tips */}
              <div className="bg-card rounded-2xl border border-border/50 shadow-card p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-xl bg-primary/10">
                    <Lightbulb className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h2 className="font-semibold text-foreground">Quick Tips</h2>
                    <p className="text-xs text-muted-foreground">
                      {seenTips.length > 0 
                        ? `You've seen ${seenTips.length} tip(s)` 
                        : 'Contextual hints as you explore'}
                    </p>
                  </div>
                </div>
                
                <Button
                  variant="outline"
                  onClick={() => {
                    resetAllTips();
                    localStorage.removeItem('luminary_onboarding_complete');
                    localStorage.removeItem('luminary_tutor_onboarding_complete');
                    localStorage.removeItem('luminary_admin_onboarding_complete');
                    toast({
                      title: "Tutorials Reset",
                      description: "You'll see all onboarding tutorials again.",
                    });
                  }}
                  className="w-full"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset All Tips & Tutorial
                </Button>
              </div>
            </div>
          )}

          {/* Appearance Tab */}
          {activeTab === 'appearance' && (
            <div className="bg-card rounded-2xl border border-border/50 shadow-card p-5 space-y-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-xl bg-primary/10">
                  <Palette className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-semibold text-foreground">App Appearance</h2>
                  <p className="text-xs text-muted-foreground">Customize how the app looks</p>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium mb-3 block">Theme Mode</Label>
                <div className="grid grid-cols-3 gap-3">
                  {themeOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setTheme(option.value)}
                      className={cn(
                        "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                        theme === option.value
                          ? "border-primary bg-primary/5"
                          : "border-border bg-secondary/50 hover:border-primary/50"
                      )}
                    >
                      <option.icon className={cn(
                        "w-6 h-6",
                        theme === option.value ? "text-primary" : "text-muted-foreground"
                      )} />
                      <span className={cn(
                        "text-sm font-medium",
                        theme === option.value ? "text-primary" : "text-muted-foreground"
                      )}>
                        {option.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div className="mt-6 p-4 rounded-xl bg-secondary/50 border border-border">
                <p className="text-sm text-muted-foreground text-center">
                  {theme === 'system' 
                    ? "Theme will follow your device settings"
                    : `${theme.charAt(0).toUpperCase() + theme.slice(1)} mode is active`}
                </p>
              </div>
            </div>
          )}

          {/* Offline Tab */}
          {activeTab === 'offline' && (
            <div className="bg-card rounded-2xl border border-border/50 shadow-card p-5 space-y-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-xl bg-primary/10">
                  {offlineSync.isOnline ? (
                    <Wifi className="w-5 h-5 text-primary" />
                  ) : (
                    <WifiOff className="w-5 h-5 text-destructive" />
                  )}
                </div>
                <div>
                  <h2 className="font-semibold text-foreground">Offline Mode</h2>
                  <p className="text-xs text-muted-foreground">
                    {offlineSync.isOnline ? 'You are online' : 'You are offline'}
                  </p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Download flashcards and quizzes to study offline. Your progress will sync when you're back online.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-secondary rounded-xl text-center">
                  <p className="text-2xl font-bold text-primary">{offlineSync.offlineDecksCount}</p>
                  <p className="text-xs text-muted-foreground">Flashcard Decks</p>
                </div>
                <div className="p-4 bg-secondary rounded-xl text-center">
                  <p className="text-2xl font-bold text-primary">{offlineSync.offlineQuizzesCount}</p>
                  <p className="text-xs text-muted-foreground">Quizzes Saved</p>
                </div>
              </div>
              <Button
                onClick={offlineSync.downloadForOffline}
                disabled={offlineSync.isSyncing || !offlineSync.isOnline}
                className="w-full"
              >
                <Download className="w-4 h-4 mr-2" />
                {offlineSync.isSyncing ? 'Downloading...' : 'Download for Offline'}
              </Button>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="space-y-5">
              {/* Change Email Card */}
              <div className="bg-card rounded-2xl border border-border/50 shadow-card p-5 space-y-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-xl bg-primary/10">
                    <Mail className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-foreground">Change Email</h2>
                    <p className="text-xs text-muted-foreground">Update your login email address</p>
                  </div>
                </div>

                <div className="p-3 bg-secondary/50 rounded-xl">
                  <p className="text-xs text-muted-foreground">Current email</p>
                  <p className="text-sm font-medium text-foreground">{user?.email}</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">New Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="Enter new email address"
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <Button
                    onClick={handleChangeEmail}
                    disabled={changingEmail || !newEmail}
                    className="w-full"
                  >
                    {changingEmail ? (
                      <span className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                        Sending verification...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        Update Email
                      </span>
                    )}
                  </Button>
                  
                  <p className="text-xs text-muted-foreground text-center">
                    A verification email will be sent to your new address
                  </p>
                </div>
              </div>

              {/* Change Password Card */}
              <div className="bg-card rounded-2xl border border-border/50 shadow-card p-5 space-y-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-xl bg-primary/10">
                    <Shield className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-foreground">Change Password</h2>
                    <p className="text-xs text-muted-foreground">Update your account password</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">New Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type={showPasswords ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password (min. 6 chars)"
                        className="pl-10 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords(!showPasswords)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Confirm New Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type={showPasswords ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm your new password"
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <Button
                    onClick={handleChangePassword}
                    disabled={changingPassword || !newPassword || !confirmPassword}
                    className="w-full"
                  >
                    {changingPassword ? (
                      <span className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                        Updating...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Lock className="w-4 h-4" />
                        Change Password
                      </span>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Save Button */}
        <div className="fixed bottom-20 left-0 right-0 px-5 pb-4 bg-gradient-to-t from-background via-background to-transparent pt-6">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full h-12 rounded-xl font-semibold shadow-glow"
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                Saving...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Save className="w-5 h-5" />
                Save Settings
              </span>
            )}
          </Button>
        </div>
      </div>
    </MobileLayout>
  );
};

export default SettingsPage;
