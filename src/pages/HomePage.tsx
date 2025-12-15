import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { LuminaAvatar } from '@/components/lumina/LuminaAvatar';
import { StatCard } from '@/components/ui/stat-card';
import { QuickAction } from '@/components/ui/quick-action';
import { HomePageSkeleton } from '@/components/ui/skeletons';
import { StudyRemindersCard } from '@/components/lumina/StudyRemindersCard';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { haptics } from '@/lib/haptics';
import lmvLogo from '@/assets/lmv-logo.png';
import { 
  Flame, 
  Clock, 
  Target, 
  BookOpen,
  MessageCircle,
  Calendar,
  Focus,
  FileText,
  PenLine,
  Bell,
  ChevronRight,
  Upload,
  BarChart3
} from 'lucide-react';
import { format } from 'date-fns';

interface Profile {
  full_name: string | null;
  streak_days: number | null;
  total_study_hours: number | null;
  tasks_completed: number | null;
  cases_read: number | null;
}

interface StudyTask {
  id: string;
  title: string;
  scheduled_time: string | null;
  task_type: string | null;
  completed: boolean | null;
}

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [todaysTasks, setTodaysTasks] = useState<StudyTask[]>([]);
  const [greeting, setGreeting] = useState('Good morning');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) setGreeting('Good morning');
    else if (hour >= 12 && hour < 17) setGreeting('Good afternoon');
    else setGreeting('Good evening');

    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      // Fetch profile - use maybeSingle to avoid errors if no profile exists
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, streak_days, total_study_hours, tasks_completed, cases_read')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
      } else if (profileData) {
        setProfile(profileData);
      }

      // Fetch today's tasks
      const today = format(new Date(), 'yyyy-MM-dd');
      const { data: tasksData, error: tasksError } = await supabase
        .from('study_tasks')
        .select('id, title, scheduled_time, task_type, completed')
        .eq('user_id', user.id)
        .eq('scheduled_date', today)
        .order('scheduled_time', { ascending: true })
        .limit(3);

      if (tasksError) {
        console.error('Error fetching tasks:', tasksError);
      } else if (tasksData) {
        setTodaysTasks(tasksData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const stats = [
    { icon: Flame, label: 'Day Streak', value: profile?.streak_days || 0, trend: profile?.streak_days && profile.streak_days > 0 ? { value: 8, positive: true } : undefined },
    { icon: Clock, label: 'Study Hours', value: (profile?.total_study_hours || 0).toFixed(1), trend: { value: 15, positive: true } },
    { icon: Target, label: 'Tasks Done', value: profile?.tasks_completed || 0, trend: { value: 12, positive: true } },
    { icon: BookOpen, label: 'Cases Read', value: profile?.cases_read || 0 },
  ];

  const quickActions = [
    { icon: MessageCircle, label: 'Chat with Lumina', description: 'Get instant study help', path: '/chat' },
    { icon: BarChart3, label: 'Analytics', description: 'Track your progress', path: '/analytics' },
    { icon: Focus, label: 'Deep Focus Mode', description: 'Block distractions', path: '/focus' },
    { icon: Target, label: 'Achievements', description: 'View your badges', path: '/achievements' },
  ];

  const formatTime = (time: string | null) => {
    if (!time) return 'Anytime';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getTaskTypeLabel = (type: string | null) => {
    const types: Record<string, string> = {
      study: 'Study',
      revision: 'Revision',
      quiz: 'Quiz',
      reading: 'Reading',
      assignment: 'Assignment',
    };
    return types[type || 'study'] || 'Study';
  };

  const firstName = profile?.full_name?.split(' ')[0] || 'Student';

  if (isLoading) {
    return (
      <MobileLayout>
        <HomePageSkeleton />
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <div className="py-6 safe-top">
        {/* Header with Logo */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <img 
              src={lmvLogo} 
              alt="Luminary Study" 
              className="w-10 h-10 object-contain rounded-xl"
            />
            <div className="flex flex-col">
              <span className="font-display font-semibold text-foreground text-lg leading-tight">
                Luminary
              </span>
              <span className="text-[10px] text-muted-foreground font-medium tracking-wider uppercase">
                Study
              </span>
            </div>
          </div>
          <button 
            onClick={() => navigate('/notifications')}
            className="relative p-2 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors"
          >
            <Bell className="w-5 h-5 text-foreground" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
          </button>
        </div>

        {/* Greeting Card with Lumina */}
        <div className="gradient-primary rounded-3xl p-5 mb-6 shadow-glow relative overflow-hidden animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary-foreground/10 rounded-full blur-2xl" />
          <div className="flex items-center gap-4 relative z-10">
            <LuminaAvatar size="lg" isActive />
            <div className="flex-1">
              <p className="text-primary-foreground/80 text-sm mb-1">{greeting}, {firstName}!</p>
              <h1 className="text-primary-foreground text-xl font-bold mb-2">Ready to excel today?</h1>
              <button 
                onClick={() => { haptics.medium(); navigate('/chat'); }}
                className="flex items-center gap-2 bg-primary-foreground/20 rounded-full px-4 py-2 text-sm text-primary-foreground hover:bg-primary-foreground/30 transition-all hover:scale-105 active:scale-95"
              >
                <span>Ask Lumina anything</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Lumina's Study Reminders */}
        <StudyRemindersCard />

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {stats.map((stat, index) => (
            <div 
              key={index}
              className="animate-fade-in-up opacity-0"
              style={{ animationDelay: `${0.2 + index * 0.05}s`, animationFillMode: 'forwards' }}
            >
              <StatCard
                icon={stat.icon}
                label={stat.label}
                value={stat.value}
                trend={stat.trend}
              />
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mb-6 animate-fade-in-up opacity-0" style={{ animationDelay: '0.4s', animationFillMode: 'forwards' }}>
          <h2 className="text-lg font-semibold text-foreground mb-3">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action, index) => (
              <div 
                key={index}
                className="animate-scale-in opacity-0"
                style={{ animationDelay: `${0.45 + index * 0.05}s`, animationFillMode: 'forwards' }}
              >
                <QuickAction
                  icon={action.icon}
                  label={action.label}
                  description={action.description}
                  onClick={() => navigate(action.path)}
                  variant={index === 0 ? 'gradient' : 'default'}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Today's Schedule */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-foreground">Today's Schedule</h2>
            <button 
              onClick={() => navigate('/planner')}
              className="text-sm text-primary font-medium flex items-center gap-1"
            >
              View All
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-3">
            {todaysTasks.length > 0 ? (
              todaysTasks.map((task) => (
                <div
                  key={task.id}
                  className="bg-card rounded-2xl p-4 border border-border/50 shadow-card flex items-center gap-4"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{task.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatTime(task.scheduled_time)} · {getTaskTypeLabel(task.task_type)}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              ))
            ) : (
              <div className="bg-card rounded-2xl p-6 border border-border/50 shadow-card text-center">
                <Calendar className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground text-sm">No tasks scheduled for today</p>
                <button 
                  onClick={() => navigate('/planner')}
                  className="mt-2 text-primary text-sm font-medium"
                >
                  Add a task
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Upload Prompt */}
        <button 
          onClick={() => navigate('/upload')}
          className="w-full bg-secondary rounded-2xl p-5 border border-dashed border-primary/30 flex items-center gap-4 hover:bg-primary/5 transition-colors"
        >
          <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
            <Upload className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="flex-1 text-left">
            <p className="font-semibold text-foreground">Upload Study Materials</p>
            <p className="text-xs text-muted-foreground">Past papers, notes, lecture videos</p>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>
    </MobileLayout>
  );
};

export default HomePage;