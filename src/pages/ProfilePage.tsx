import React, { useState, useEffect } from 'react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { LMVLogo } from '@/components/ui/lmv-logo';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  User,
  Users,
  CreditCard,
  Bell,
  HelpCircle,
  LogOut,
  ChevronRight,
  Trophy,
  Target,
  Flame,
  Shield,
  GraduationCap,
  Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface Profile {
  full_name: string | null;
  university: string | null;
  year_of_study: number | null;
  streak_days: number | null;
  tasks_completed: number | null;
  total_study_hours: number | null;
}

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdmin();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error fetching profile:', error);
        } else if (data) {
          setProfile(data);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  const handleLogout = async () => {
    try {
      await signOut();
      toast({
        title: "Logged Out",
        description: "You've been successfully logged out.",
      });
      navigate('/auth');
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to log out. Please try again.",
      });
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;

    try {
      // Delete user profile data
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      // Sign out the user
      await signOut();

      toast({
        title: "Account Deleted",
        description: "Your profile data has been permanently deleted.",
      });

      navigate('/auth');
    } catch (error) {
      console.error('Error deleting account:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete account. Please try again.",
      });
    }
  };

  const menuItems: Array<{ icon: React.ComponentType<{ className?: string }>; label: string; path: string; highlight?: boolean }> = [
    { icon: User, label: 'Account Settings', path: '/settings' },
    { icon: Users, label: 'Accountability Partner', path: '/partner' },
    { icon: CreditCard, label: 'Subscription & Payments', path: '/subscription' },
    { icon: Bell, label: 'Notifications', path: '/notifications' },
    { icon: HelpCircle, label: 'Help & Support', path: '/support' },
  ];

  // Add admin option if user is admin
  if (isAdmin) {
    menuItems.unshift({ icon: Shield, label: 'Admin Dashboard', path: '/admin', highlight: true });
  }

  const stats = [
    { icon: Flame, value: profile?.streak_days || 0, label: 'Day Streak' },
    { icon: Trophy, value: profile?.tasks_completed || 0, label: 'Completed' },
    { icon: Target, value: Math.round(profile?.total_study_hours || 0), label: 'Study Hrs' },
  ];

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'Student';
  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const yearLabel = profile?.year_of_study ? `Year ${profile.year_of_study}` : '';

  return (
    <MobileLayout>
      <div className="py-6 safe-top">
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
              {initials}
            </div>
            <div>
              <h2 className="text-xl font-bold text-primary-foreground">{displayName}</h2>
              <p className="text-sm text-primary-foreground/80 flex items-center gap-1">
                <GraduationCap className="w-4 h-4" />
                {profile?.university || 'Law Student'} {yearLabel && `· ${yearLabel}`}
              </p>
              {isAdmin && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 mt-1 bg-primary-foreground/20 rounded-full text-xs text-primary-foreground">
                  <Shield className="w-3 h-3" /> Admin
                </span>
              )}
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
        <button 
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-4 text-destructive hover:bg-destructive/5 rounded-2xl transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium text-sm">Log Out</span>
        </button>

        {/* Delete Account */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button 
              className="w-full flex items-center justify-center gap-2 py-4 mt-2 text-destructive/70 hover:text-destructive hover:bg-destructive/5 rounded-2xl transition-colors border border-destructive/20"
            >
              <Trash2 className="w-5 h-5" />
              <span className="font-medium text-sm">Delete Account</span>
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete your account?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete your profile data, study progress, and all associated information from our servers.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDeleteAccount}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete Account
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Version */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          Luminary Study v1.0.0
        </p>
      </div>
    </MobileLayout>
  );
};

export default ProfilePage;
