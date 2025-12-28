import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAdmin } from '@/hooks/useAdmin';
import { supabase } from '@/integrations/supabase/client';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { AdminManagement } from '@/components/admin/AdminManagement';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import CourseManagement from '@/components/admin/CourseManagement';
import TutorPerformance from '@/components/admin/TutorPerformance';
import TutorActivityDashboard from '@/components/admin/TutorActivityDashboard';
import StudentManagement from '@/components/admin/StudentManagement';
import BulkEnrollmentManager from '@/components/admin/BulkEnrollmentManager';
import ClassPricingManager from '@/components/admin/ClassPricingManager';
import { RoleSwitcher } from '@/components/layout/RoleSwitcher';
import { AdminOnboardingTutorial } from '@/components/onboarding/AdminOnboardingTutorial';
import { AdminStatsDetailModal, AdminStatType } from '@/components/admin/AdminStatsDetailModal';
import { 
  Shield, Users, BookOpen, FileText, GraduationCap, 
  TrendingUp, AlertCircle, CheckCircle, Clock, 
  BarChart3, Activity, Settings, ChevronRight,
  UserCheck, UserX, Calendar, MessageSquare, ClipboardList
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface DashboardStats {
  totalUsers: number;
  totalCourses: number;
  totalEnrollments: number;
  pendingApplications: number;
  activeClasses: number;
  libraryContent: number;
}

interface RecentActivity {
  id: string;
  type: 'enrollment' | 'application' | 'class' | 'content';
  description: string;
  timestamp: string;
}

const AdminDashboardPage: React.FC = () => {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [activeTab, setActiveTab] = useState('overview');
  const [showOnboarding, setShowOnboarding] = useState(() => {
    return !localStorage.getItem('luminary_admin_onboarding_complete');
  });
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalCourses: 0,
    totalEnrollments: 0,
    pendingApplications: 0,
    activeClasses: 0,
    libraryContent: 0,
  });
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [statsModalOpen, setStatsModalOpen] = useState(false);
  const [statsModalType, setStatsModalType] = useState<AdminStatType>(null);

  useEffect(() => {
    if (isAdmin) {
      loadDashboardData();
      
      // Set up real-time subscriptions for live updates
      const profilesChannel = supabase
        .channel('admin-profiles')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
          loadDashboardData();
        })
        .subscribe();

      const enrollmentsChannel = supabase
        .channel('admin-enrollments')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'academy_enrollments' }, () => {
          loadDashboardData();
        })
        .subscribe();

      const applicationsChannel = supabase
        .channel('admin-applications')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tutor_applications' }, () => {
          loadDashboardData();
        })
        .subscribe();

      const classesChannel = supabase
        .channel('admin-classes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'live_classes' }, () => {
          loadDashboardData();
        })
        .subscribe();

      // Refresh data every 30 seconds as backup
      const interval = setInterval(loadDashboardData, 30000);

      return () => {
        supabase.removeChannel(profilesChannel);
        supabase.removeChannel(enrollmentsChannel);
        supabase.removeChannel(applicationsChannel);
        supabase.removeChannel(classesChannel);
        clearInterval(interval);
      };
    }
  }, [isAdmin]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [
        profilesResult,
        coursesResult,
        enrollmentsResult,
        applicationsResult,
        classesResult,
        contentResult,
      ] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('academy_courses').select('id', { count: 'exact', head: true }),
        supabase.from('academy_enrollments').select('id', { count: 'exact', head: true }),
        supabase.from('tutor_applications').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('live_classes').select('id', { count: 'exact', head: true }).in('status', ['scheduled', 'live']),
        supabase.from('library_content').select('id', { count: 'exact', head: true }),
      ]);

      setStats({
        totalUsers: profilesResult.count || 0,
        totalCourses: coursesResult.count || 0,
        totalEnrollments: enrollmentsResult.count || 0,
        pendingApplications: applicationsResult.count || 0,
        activeClasses: classesResult.count || 0,
        libraryContent: contentResult.count || 0,
      });

      const { data: recentEnrollments } = await supabase
        .from('academy_enrollments')
        .select('id, enrolled_at, course_id')
        .order('enrolled_at', { ascending: false })
        .limit(3);

      const { data: recentApplications } = await supabase
        .from('tutor_applications')
        .select('id, created_at, full_name, status')
        .order('created_at', { ascending: false })
        .limit(3);

      const activities: RecentActivity[] = [];
      
      recentEnrollments?.forEach(e => {
        activities.push({
          id: e.id,
          type: 'enrollment',
          description: 'New course enrollment',
          timestamp: e.enrolled_at,
        });
      });

      recentApplications?.forEach(a => {
        activities.push({
          id: a.id,
          type: 'application',
          description: `${a.full_name} - ${a.status}`,
          timestamp: a.created_at,
        });
      });

      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setRecentActivities(activities.slice(0, 5));
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (adminLoading) {
    return (
      <div className="min-h-screen flex w-full bg-background">
        <div className="hidden lg:block w-64 border-r border-border/50 p-4">
          <Skeleton className="h-16 mb-4" />
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12" />)}
          </div>
        </div>
        <div className="flex-1 p-4 sm:p-6 lg:p-8">
          <Skeleton className="h-24 w-full rounded-2xl mb-6" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-24" />)}
          </div>
        </div>
      </div>
    );
  }

  if (showOnboarding && isAdmin) {
    return <AdminOnboardingTutorial onComplete={() => setShowOnboarding(false)} />;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex w-full bg-background items-center justify-center">
        <div className="flex flex-col items-center justify-center p-5 text-center">
          <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
            <AlertCircle className="w-10 h-10 text-destructive" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Access Denied</h2>
          <p className="text-muted-foreground">
            You don't have permission to access the admin dashboard.
          </p>
          <Link to="/home" className="mt-4 text-primary hover:underline">
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  const statCards: { label: string; value: number; icon: any; color: string; bgColor: string; statType: AdminStatType; highlight?: boolean }[] = [
    { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'text-blue-500', bgColor: 'bg-blue-500/10', statType: 'users' },
    { label: 'Active Courses', value: stats.totalCourses, icon: BookOpen, color: 'text-emerald-500', bgColor: 'bg-emerald-500/10', statType: 'courses' },
    { label: 'Enrollments', value: stats.totalEnrollments, icon: GraduationCap, color: 'text-purple-500', bgColor: 'bg-purple-500/10', statType: 'enrollments' },
    { label: 'Pending Apps', value: stats.pendingApplications, icon: Clock, color: 'text-orange-500', bgColor: 'bg-orange-500/10', highlight: stats.pendingApplications > 0, statType: 'applications' },
    { label: 'Active Classes', value: stats.activeClasses, icon: Activity, color: 'text-pink-500', bgColor: 'bg-pink-500/10', statType: 'classes' },
    { label: 'Library Items', value: stats.libraryContent, icon: FileText, color: 'text-cyan-500', bgColor: 'bg-cyan-500/10', statType: 'library' },
  ];

  const quickActions = [
    { label: 'Tutor Applications', description: 'Review and approve', icon: UserCheck, tab: 'tutors', badge: stats.pendingApplications > 0 ? stats.pendingApplications : undefined },
    { label: 'Manage Courses', description: 'Add or remove courses', icon: BookOpen, tab: 'courses' },
    { label: 'Enrollments', description: 'Enroll/unenroll students', icon: ClipboardList, tab: 'enrollments' },
    { label: 'Library Content', description: 'Manage resources', icon: FileText, tab: 'content' },
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'enrollment': return GraduationCap;
      case 'application': return UserCheck;
      case 'class': return Calendar;
      case 'content': return FileText;
      default: return Activity;
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const date = new Date(timestamp);
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {loading ? (
                [1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)
              ) : (
                statCards.map((stat, idx) => (
                  <Card 
                    key={idx} 
                    className={cn(
                      "border-border/50 cursor-pointer hover:border-primary/30 transition-colors", 
                      stat.highlight && "border-orange-500/50 bg-orange-500/5"
                    )}
                    onClick={() => { setStatsModalType(stat.statType); setStatsModalOpen(true); }}
                  >
                    <CardContent className="p-4">
                      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center mb-2", stat.bgColor)}>
                        <stat.icon className={cn("w-4 h-4", stat.color)} />
                      </div>
                      <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            {/* Quick Actions */}
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Quick Actions</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {quickActions.map((action, idx) => (
                  <Card
                    key={idx}
                    onClick={() => setActiveTab(action.tab)}
                    className="border-border/50 hover:border-primary/30 transition-colors cursor-pointer h-full"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <action.icon className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-foreground text-sm">{action.label}</p>
                            {action.badge && (
                              <Badge variant="destructive" className="text-xs px-1.5 py-0.5">{action.badge}</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{action.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-12" />)}</div>
                ) : recentActivities.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">No recent activity</p>
                ) : (
                  <div className="space-y-3">
                    {recentActivities.map((activity) => {
                      const Icon = getActivityIcon(activity.type);
                      return (
                        <div key={activity.id} className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                            <Icon className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-foreground truncate">{activity.description}</p>
                            <p className="text-xs text-muted-foreground">{formatTimeAgo(activity.timestamp)}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );

      case 'courses':
        return <CourseManagement />;

      case 'enrollments':
        return <BulkEnrollmentManager />;

      case 'tutors':
        return (
          <div className="space-y-6">
            <TutorActivityDashboard />
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <UserCheck className="w-5 h-5" />
                  Tutor Applications
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Link to="/admin/tutors">
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                        <Clock className="w-5 h-5 text-orange-500" />
                      </div>
                      <div>
                        <p className="font-medium">Review Applications</p>
                        <p className="text-sm text-muted-foreground">{stats.pendingApplications} pending</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </Link>
              </CardContent>
            </Card>
          </div>
        );

      case 'students':
        return <StudentManagement />;

      case 'content':
        return (
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="w-5 h-5" />
                Library Content Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Link to="/admin/content">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-cyan-500" />
                    </div>
                    <div>
                      <p className="font-medium">Manage Content</p>
                      <p className="text-sm text-muted-foreground">Cases, past papers, and materials</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </Link>
            </CardContent>
          </Card>
        );

      case 'analytics':
        return (
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="w-5 h-5" />
                Platform Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Link to="/analytics">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-indigo-500" />
                    </div>
                    <div>
                      <p className="font-medium">View Analytics</p>
                      <p className="text-sm text-muted-foreground">Study progress and metrics</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </Link>
            </CardContent>
          </Card>
        );

      case 'pricing':
        return <ClassPricingManager />;

      case 'settings':
        return <AdminManagement />;

      default:
        return null;
    }
  };

  return (
    <MobileLayout showNav={false}>
      <div className="flex min-h-screen w-full">
        {/* Sidebar */}
        <AdminSidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          pendingApplications={stats.pendingApplications}
        />

        {/* Main Content */}
        <main className="flex-1 min-w-0 overflow-auto">
          <div className="p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Link to="/profile" className="text-muted-foreground hover:text-foreground lg:hidden">
                  <ChevronRight className="w-5 h-5 rotate-180" />
                </Link>
                <div className="hidden lg:flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-foreground">Admin Dashboard</h1>
                    <p className="text-sm text-muted-foreground">LMV Academy Management</p>
                  </div>
                </div>
                <h1 className="text-lg font-bold lg:hidden">Admin Dashboard</h1>
              </div>
              <RoleSwitcher />
            </div>

            {/* Mobile Tab Indicator */}
            <div className="lg:hidden mb-4">
              <Badge variant="secondary" className="text-xs">
                {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
              </Badge>
            </div>

            {/* Content */}
            {renderContent()}
          </div>
        </main>
      </div>

      {/* Stats Detail Modal */}
      <AdminStatsDetailModal
        open={statsModalOpen}
        onOpenChange={setStatsModalOpen}
        statType={statsModalType}
      />
    </MobileLayout>
  );
};

export default AdminDashboardPage;
