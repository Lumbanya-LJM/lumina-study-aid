import React, { useState, useEffect } from 'react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { LMVLogo } from '@/components/ui/lmv-logo';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
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
  AlertCircle
} from 'lucide-react';
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

type ThemeMode = 'light' | 'dark' | 'system';

const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const pushNotifications = usePushNotifications();
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'notifications' | 'goals' | 'appearance'>('notifications');

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

  // Appearance
  const [theme, setTheme] = useState<ThemeMode>('system');

  // Load settings from localStorage
  useEffect(() => {
    const savedNotifications = localStorage.getItem('luminary_notifications');
    const savedGoals = localStorage.getItem('luminary_goals');
    const savedTheme = localStorage.getItem('luminary_theme');

    if (savedNotifications) {
      setNotifications(JSON.parse(savedNotifications));
    }
    if (savedGoals) {
      setGoals(JSON.parse(savedGoals));
    }
    if (savedTheme) {
      setTheme(savedTheme as ThemeMode);
    }
  }, []);

  // Apply theme
  useEffect(() => {
    const root = document.documentElement;
    
    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'light') {
      root.classList.remove('dark');
    } else {
      // System preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  }, [theme]);

  const handleSave = () => {
    setSaving(true);
    
    // Save to localStorage
    localStorage.setItem('luminary_notifications', JSON.stringify(notifications));
    localStorage.setItem('luminary_goals', JSON.stringify(goals));
    localStorage.setItem('luminary_theme', theme);

    setTimeout(() => {
      setSaving(false);
      toast({
        title: "Settings Saved",
        description: "Your preferences have been updated.",
      });
    }, 500);
  };

  const tabs = [
    { id: 'notifications' as const, label: 'Notifications', icon: Bell },
    { id: 'goals' as const, label: 'Study Goals', icon: Target },
    { id: 'appearance' as const, label: 'Appearance', icon: Palette },
  ];

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
      <div className="px-5 py-6 safe-top pb-24">
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
