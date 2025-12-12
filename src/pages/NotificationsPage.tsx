import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Bell, BellOff, CheckCircle2, BookOpen, Calendar, MessageSquare, Trophy, Loader2, TestTube, ArrowLeft } from 'lucide-react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { toast } from 'sonner';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'study' | 'quiz' | 'reminder' | 'achievement';
  read: boolean;
  createdAt: Date;
}

// Mock notification history - in production, fetch from database
const mockNotifications: NotificationItem[] = [
  {
    id: '1',
    title: 'Study Reminder',
    message: 'Time to review your Constitutional Law flashcards!',
    type: 'reminder',
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 30), // 30 min ago
  },
  {
    id: '2',
    title: 'Quiz Completed',
    message: 'You scored 85% on your Contract Law quiz. Great job!',
    type: 'quiz',
    read: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
  },
  {
    id: '3',
    title: 'Achievement Unlocked',
    message: 'You earned the "7-Day Streak" badge!',
    type: 'achievement',
    read: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
  },
  {
    id: '4',
    title: 'New Case Added',
    message: 'A new landmark case has been added to the library.',
    type: 'study',
    read: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48), // 2 days ago
  },
];

const getNotificationIcon = (type: NotificationItem['type']) => {
  switch (type) {
    case 'study':
      return <BookOpen className="h-4 w-4" />;
    case 'quiz':
      return <CheckCircle2 className="h-4 w-4" />;
    case 'reminder':
      return <Calendar className="h-4 w-4" />;
    case 'achievement':
      return <Trophy className="h-4 w-4" />;
    default:
      return <MessageSquare className="h-4 w-4" />;
  }
};

const formatTimeAgo = (date: Date) => {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { isSupported, isSubscribed, permission, loading, subscribe, unsubscribe, sendTestNotification } = usePushNotifications();
  const [notifications] = useState<NotificationItem[]>(mockNotifications);
  
  // Notification preferences (local state - could be saved to database)
  const [preferences, setPreferences] = useState({
    studyReminders: true,
    quizResults: true,
    achievements: true,
    weeklyReports: true,
    partnerUpdates: true,
  });

  const handleToggleNotifications = async () => {
    if (isSubscribed) {
      const success = await unsubscribe();
      if (success) {
        toast.success('Push notifications disabled');
      }
    } else {
      const success = await subscribe();
      if (success) {
        toast.success('Push notifications enabled');
      }
    }
  };

  const handleTestNotification = async () => {
    await sendTestNotification();
    toast.success('Test notification sent!');
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <MobileLayout showNav={false}>
      {/* Header */}
      <div className="sticky top-0 z-10 glass border-b border-border">
        <div className="flex items-center gap-3 p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Notifications</h1>
        </div>
      </div>

      <div className="p-4 space-y-6 pb-24">
        {/* Push Notification Status */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              {isSubscribed ? (
                <Bell className="h-5 w-5 text-primary" />
              ) : (
                <BellOff className="h-5 w-5 text-muted-foreground" />
              )}
              Push Notifications
            </CardTitle>
            <CardDescription>
              {!isSupported 
                ? 'Push notifications are not supported on this device'
                : isSubscribed 
                  ? 'You will receive notifications for study reminders and updates'
                  : 'Enable to receive study reminders and important updates'
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="push-toggle" className="font-medium">
                Enable Push Notifications
              </Label>
              <Button
                variant={isSubscribed ? 'outline' : 'default'}
                size="sm"
                onClick={handleToggleNotifications}
                disabled={loading || !isSupported}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isSubscribed ? (
                  'Disable'
                ) : (
                  'Enable'
                )}
              </Button>
            </div>
            
            {isSubscribed && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestNotification}
                className="w-full"
              >
                <TestTube className="h-4 w-4 mr-2" />
                Send Test Notification
              </Button>
            )}

            {permission === 'denied' && (
              <p className="text-sm text-destructive">
                Notifications are blocked. Please enable them in your browser settings.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Notification Preferences */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Notification Preferences</CardTitle>
            <CardDescription>
              Choose which notifications you want to receive
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Study Reminders</Label>
                <p className="text-sm text-muted-foreground">Daily study and revision reminders</p>
              </div>
              <Switch
                checked={preferences.studyReminders}
                onCheckedChange={(checked) => setPreferences(p => ({ ...p, studyReminders: checked }))}
              />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Quiz Results</Label>
                <p className="text-sm text-muted-foreground">Notifications when quizzes are graded</p>
              </div>
              <Switch
                checked={preferences.quizResults}
                onCheckedChange={(checked) => setPreferences(p => ({ ...p, quizResults: checked }))}
              />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Achievements</Label>
                <p className="text-sm text-muted-foreground">Badges and milestone notifications</p>
              </div>
              <Switch
                checked={preferences.achievements}
                onCheckedChange={(checked) => setPreferences(p => ({ ...p, achievements: checked }))}
              />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Weekly Reports</Label>
                <p className="text-sm text-muted-foreground">Summary of your weekly progress</p>
              </div>
              <Switch
                checked={preferences.weeklyReports}
                onCheckedChange={(checked) => setPreferences(p => ({ ...p, weeklyReports: checked }))}
              />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Partner Updates</Label>
                <p className="text-sm text-muted-foreground">Activity from accountability partners</p>
              </div>
              <Switch
                checked={preferences.partnerUpdates}
                onCheckedChange={(checked) => setPreferences(p => ({ ...p, partnerUpdates: checked }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Notification History */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Recent Notifications</CardTitle>
              {unreadCount > 0 && (
                <Badge variant="secondary">{unreadCount} unread</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {notifications.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No notifications yet
              </p>
            ) : (
              <div className="space-y-3">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`flex gap-3 p-3 rounded-lg transition-colors ${
                      notification.read ? 'bg-muted/30' : 'bg-primary/5 border border-primary/20'
                    }`}
                  >
                    <div className={`p-2 rounded-full ${
                      notification.read ? 'bg-muted' : 'bg-primary/10 text-primary'
                    }`}>
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`font-medium text-sm ${!notification.read && 'text-primary'}`}>
                          {notification.title}
                        </p>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatTimeAgo(notification.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {notification.message}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MobileLayout>
  );
}
