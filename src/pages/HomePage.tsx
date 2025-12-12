import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { LMVLogo } from '@/components/ui/lmv-logo';
import { LuminaAvatar } from '@/components/lumina/LuminaAvatar';
import { StatCard } from '@/components/ui/stat-card';
import { QuickAction } from '@/components/ui/quick-action';
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
  Upload
} from 'lucide-react';

const HomePage: React.FC = () => {
  const navigate = useNavigate();

  const stats = [
    { icon: Flame, label: 'Day Streak', value: 12, trend: { value: 8, positive: true } },
    { icon: Clock, label: 'Study Hours', value: '24.5', trend: { value: 15, positive: true } },
    { icon: Target, label: 'Tasks Done', value: 47, trend: { value: 12, positive: true } },
    { icon: BookOpen, label: 'Cases Read', value: 28 },
  ];

  const quickActions = [
    { icon: MessageCircle, label: 'Chat with Lumina', description: 'Get instant study help', path: '/chat' },
    { icon: Focus, label: 'Deep Focus Mode', description: 'Block distractions', path: '/focus' },
    { icon: FileText, label: 'Upload Content', description: 'Notes, past papers, videos', path: '/upload' },
    { icon: PenLine, label: 'Journal Entry', description: 'Reflect on your day', path: '/journal' },
  ];

  const upcomingTasks = [
    { title: 'Contract Law Revision', time: '2:00 PM', type: 'Active Recall' },
    { title: 'R v Brown Case Summary', time: '4:30 PM', type: 'Reading' },
    { title: 'Constitutional Law Quiz', time: '6:00 PM', type: 'Quiz' },
  ];

  return (
    <MobileLayout>
      <div className="px-5 py-6 safe-top">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <LMVLogo size="sm" />
          <button className="relative p-2 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors">
            <Bell className="w-5 h-5 text-foreground" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
          </button>
        </div>

        {/* Greeting Card with Lumina */}
        <div className="gradient-primary rounded-3xl p-5 mb-6 shadow-glow relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary-foreground/10 rounded-full blur-2xl" />
          <div className="flex items-center gap-4 relative z-10">
            <LuminaAvatar size="lg" isActive />
            <div className="flex-1">
              <p className="text-primary-foreground/80 text-sm mb-1">Good morning!</p>
              <h1 className="text-primary-foreground text-xl font-bold mb-2">Ready to excel today?</h1>
              <button 
                onClick={() => navigate('/chat')}
                className="flex items-center gap-2 bg-primary-foreground/20 rounded-full px-4 py-2 text-sm text-primary-foreground hover:bg-primary-foreground/30 transition-colors"
              >
                <span>Ask Lumina anything</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {stats.map((stat, index) => (
            <StatCard
              key={index}
              icon={stat.icon}
              label={stat.label}
              value={stat.value}
              trend={stat.trend}
            />
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-3">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action, index) => (
              <QuickAction
                key={index}
                icon={action.icon}
                label={action.label}
                description={action.description}
                onClick={() => navigate(action.path)}
                variant={index === 0 ? 'gradient' : 'default'}
              />
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
            {upcomingTasks.map((task, index) => (
              <div
                key={index}
                className="bg-card rounded-2xl p-4 border border-border/50 shadow-card flex items-center gap-4"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{task.title}</p>
                  <p className="text-xs text-muted-foreground">{task.time} · {task.type}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>
            ))}
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