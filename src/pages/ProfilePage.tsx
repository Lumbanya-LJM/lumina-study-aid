import React from 'react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { LMVLogo } from '@/components/ui/lmv-logo';
import { LuminaAvatar } from '@/components/lumina/LuminaAvatar';
import { useNavigate } from 'react-router-dom';
import { 
  User,
  Palette,
  Users,
  CreditCard,
  Bell,
  HelpCircle,
  LogOut,
  ChevronRight,
  Trophy,
  Target,
  Flame
} from 'lucide-react';
import { cn } from '@/lib/utils';

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();

  const menuItems = [
    { icon: User, label: 'Account Settings', path: '/settings' },
    { icon: Palette, label: 'Customize Lumina', path: '/customize-avatar', highlight: true },
    { icon: Users, label: 'Accountability Partner', path: '/partner' },
    { icon: CreditCard, label: 'Subscription & Payments', path: '/payments' },
    { icon: Bell, label: 'Notifications', path: '/notifications' },
    { icon: HelpCircle, label: 'Help & Support', path: '/support' },
  ];

  const stats = [
    { icon: Flame, value: 12, label: 'Day Streak' },
    { icon: Trophy, value: 28, label: 'Achievements' },
    { icon: Target, value: 89, label: 'Accuracy %' },
  ];

  return (
    <MobileLayout>
      <div className="px-5 py-6 safe-top">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <LMVLogo size="sm" variant="icon" />
          <h1 className="text-lg font-semibold text-foreground">Profile</h1>
          <div className="w-10" />
        </div>

        {/* Profile Card */}
        <div className="gradient-primary rounded-3xl p-6 mb-6 shadow-glow relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-primary-foreground/10 rounded-full blur-3xl" />
          <div className="relative z-10 flex items-center gap-4 mb-6">
            <div className="w-20 h-20 rounded-2xl bg-primary-foreground/20 flex items-center justify-center text-3xl font-bold text-primary-foreground">
              JD
            </div>
            <div>
              <h2 className="text-xl font-bold text-primary-foreground">John Doe</h2>
              <p className="text-sm text-primary-foreground/80">Law Student · Year 2</p>
              <p className="text-xs text-primary-foreground/60 mt-1">Premium Member</p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-3">
            {stats.map((stat, index) => (
              <div key={index} className="bg-primary-foreground/10 rounded-xl p-3 text-center">
                <stat.icon className="w-5 h-5 text-primary-foreground mx-auto mb-1" />
                <p className="text-lg font-bold text-primary-foreground">{stat.value}</p>
                <p className="text-[10px] text-primary-foreground/70">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Customize Lumina Card */}
        <button 
          onClick={() => navigate('/customize-avatar')}
          className="w-full bg-card rounded-2xl p-4 border border-primary/30 shadow-card mb-6 flex items-center gap-4 hover:shadow-premium transition-all"
        >
          <LuminaAvatar size="lg" isActive />
          <div className="flex-1 text-left">
            <p className="font-semibold text-foreground">Customize Lumina</p>
            <p className="text-xs text-muted-foreground">Personalize your AI study buddy</p>
          </div>
          <ChevronRight className="w-5 h-5 text-primary" />
        </button>

        {/* Menu Items */}
        <div className="bg-card rounded-2xl border border-border/50 shadow-card overflow-hidden mb-6">
          {menuItems.map((item, index) => (
            <button
              key={index}
              onClick={() => navigate(item.path)}
              className={cn(
                "w-full flex items-center gap-4 px-4 py-4 text-left hover:bg-secondary/50 transition-colors",
                index !== menuItems.length - 1 && "border-b border-border/50"
              )}
            >
              <div className={cn(
                "p-2 rounded-xl",
                item.highlight ? "bg-primary/10" : "bg-secondary"
              )}>
                <item.icon className={cn(
                  "w-5 h-5",
                  item.highlight ? "text-primary" : "text-muted-foreground"
                )} />
              </div>
              <span className={cn(
                "flex-1 font-medium text-sm",
                item.highlight ? "text-primary" : "text-foreground"
              )}>
                {item.label}
              </span>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          ))}
        </div>

        {/* Logout */}
        <button className="w-full flex items-center justify-center gap-2 py-4 text-destructive hover:bg-destructive/5 rounded-2xl transition-colors">
          <LogOut className="w-5 h-5" />
          <span className="font-medium text-sm">Log Out</span>
        </button>

        {/* Version */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          Luminary Study v1.0.0
        </p>
      </div>
    </MobileLayout>
  );
};

export default ProfilePage;