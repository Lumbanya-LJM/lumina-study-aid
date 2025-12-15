import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Bell, BellOff, CheckCircle2, BookOpen, Calendar, MessageSquare, 
  Trophy, Loader2, TestTube, ArrowLeft, Scale, FileText, ExternalLink 
} from 'lucide-react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'study' | 'quiz' | 'reminder' | 'achievement';
  read: boolean;
  createdAt: Date;
}

interface LegalAlert {
  id: string;
  title: string;
  description: string | null;
  alert_type: string;
  source_url: string | null;
  citation: string | null;
  court: string | null;
  published_date: string | null;
  created_at: string;
}

// Mock notification history - in production, fetch from database
const mockNotifications: NotificationItem[] = [
  {
    id: '1',
    title: 'Study Reminder',
    message: 'Time to review your Constitutional Law flashcards!',
    type: 'reminder',
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 30),
  },
  {
    id: '2',
    title: 'Quiz Completed',
    message: 'You scored 85% on your Contract Law quiz. Great job!',
    type: 'quiz',
    read: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
  },
  {
    id: '3',
    title: 'Achievement Unlocked',
    message: 'You earned the "7-Day Streak" badge!',
    type: 'achievement',
    read: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
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

const getLegalAlertIcon = (type: string) => {
  switch (type) {
    case 'case':
      return <Scale className="h-4 w-4" />;
    case 'law':
    case 'statutory_instrument':
      return <FileText className="h-4 w-4" />;
    default:
      return <BookOpen className="h-4 w-4" />;
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
  const { user } = useAuth();
  const { isSupported, isSubscribed, permission, loading, subscribe, unsubscribe, sendTestNotification } = usePushNotifications();
  const [notifications] = useState<NotificationItem[]>(mockNotifications);
  const [legalAlerts, setLegalAlerts] = useState<LegalAlert[]>([]);
  const [readAlerts, setReadAlerts] = useState<string[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(true);
  
  const [preferences, setPreferences] = useState({
    studyReminders: true,
    quizResults: true,
    achievements: true,
    weeklyReports: true,
    partnerUpdates: true,
    legalAlerts: true,
  });

  useEffect(() => {
    loadLegalAlerts();
    loadReadStatus();
    
    // Subscribe to new legal alerts
    const channel = supabase
      .channel('legal-alerts')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'legal_alerts'
      }, (payload) => {
        const newAlert = payload.new as LegalAlert;
        setLegalAlerts(prev => [newAlert, ...prev]);
        toast.info(
          newAlert.alert_type === 'case' ? '📚 New Case Alert' : '📜 New Law Alert',
          { description: newAlert.title }
        );
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadLegalAlerts = async () => {
    setLoadingAlerts(true);
    const { data } = await supabase
      .from('legal_alerts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    setLegalAlerts(data || []);
    setLoadingAlerts(false);
  };

  const loadReadStatus = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('user_legal_alert_reads')
      .select('alert_id')
      .eq('user_id', user.id);

    setReadAlerts((data || []).map(r => r.alert_id));
  };

  const markAlertAsRead = async (alertId: string) => {
    if (!user || readAlerts.includes(alertId)) return;
    
    await supabase
      .from('user_legal_alert_reads')
      .insert({ user_id: user.id, alert_id: alertId });

    setReadAlerts(prev => [...prev, alertId]);
  };

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
  const unreadAlertCount = legalAlerts.filter(a => !readAlerts.includes(a.id)).length;

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
                  ? 'You will receive notifications for study reminders and legal updates'
                  : 'Enable to receive study reminders and legal alerts'
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

        {/* Notifications Tabs */}
        <Tabs defaultValue="legal" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="legal" className="flex-1">
              Legal Alerts
              {unreadAlertCount > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 px-1.5">{unreadAlertCount}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="general" className="flex-1">
              General
              {unreadCount > 0 && (
                <Badge variant="secondary" className="ml-2 h-5 px-1.5">{unreadCount}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="legal" className="mt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">ZambiaLII Updates</CardTitle>
                <CardDescription>New cases, laws, and statutory instruments</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingAlerts ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : legalAlerts.length === 0 ? (
                  <div className="text-center py-8">
                    <Scale className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">No legal alerts yet</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      You'll be notified when new cases or laws are published
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {legalAlerts.map((alert) => {
                      const isRead = readAlerts.includes(alert.id);
                      return (
                        <div
                          key={alert.id}
                          onClick={() => markAlertAsRead(alert.id)}
                          className={`p-4 rounded-2xl transition-colors cursor-pointer ${
                            isRead ? 'bg-muted/30' : 'bg-primary/5 border border-primary/20'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-xl ${
                              alert.alert_type === 'case' 
                                ? 'bg-primary/10 text-primary' 
                                : 'bg-warning/10 text-warning'
                            }`}>
                              {getLegalAlertIcon(alert.alert_type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <Badge variant={alert.alert_type === 'case' ? 'default' : 'secondary'} className="mb-2">
                                    {alert.alert_type === 'case' ? 'New Case' : 
                                     alert.alert_type === 'statutory_instrument' ? 'Statutory Instrument' : 'New Law'}
                                  </Badge>
                                  <p className={`font-medium text-sm ${!isRead && 'text-foreground'}`}>
                                    {alert.title}
                                  </p>
                                </div>
                              </div>
                              {alert.citation && (
                                <p className="text-xs text-primary mt-1">{alert.citation}</p>
                              )}
                              {alert.court && (
                                <p className="text-xs text-muted-foreground">{alert.court}</p>
                              )}
                              {alert.description && (
                                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                                  {alert.description}
                                </p>
                              )}
                              <div className="flex items-center justify-between mt-3">
                                <span className="text-xs text-muted-foreground">
                                  {formatTimeAgo(new Date(alert.created_at))}
                                </span>
                                {alert.source_url && (
                                  <a 
                                    href={alert.source_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-xs text-primary flex items-center gap-1 hover:underline"
                                  >
                                    View on ZambiaLII
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="general" className="mt-4 space-y-4">
            {/* Notification Preferences */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Preferences</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Study Reminders</Label>
                  <Switch
                    checked={preferences.studyReminders}
                    onCheckedChange={(checked) => setPreferences(p => ({ ...p, studyReminders: checked }))}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <Label>Legal Alerts</Label>
                  <Switch
                    checked={preferences.legalAlerts}
                    onCheckedChange={(checked) => setPreferences(p => ({ ...p, legalAlerts: checked }))}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <Label>Weekly Reports</Label>
                  <Switch
                    checked={preferences.weeklyReports}
                    onCheckedChange={(checked) => setPreferences(p => ({ ...p, weeklyReports: checked }))}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Recent Notifications */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
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
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MobileLayout>
  );
}
