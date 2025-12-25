import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAdmin } from '@/hooks/useAdmin';
import { supabase } from '@/integrations/supabase/client';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { AdminManagement } from '@/components/admin/AdminManagement';
import CourseManagement from '@/components/admin/CourseManagement';
import TutorPerformance from '@/components/admin/TutorPerformance';
import StudentManagement from '@/components/admin/StudentManagement';
import { RoleSwitcher } from '@/components/layout/RoleSwitcher';
import { 
  Shield, Users, BookOpen, FileText, GraduationCap, 
  TrendingUp, AlertCircle, CheckCircle, Clock, 
  BarChart3, Activity, Settings, ChevronRight,
  UserCheck, UserX, Calendar, MessageSquare
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

  useEffect(() => {
    if (isAdmin) {
      loadDashboardData();
    }
  }, [isAdmin]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch all stats in parallel
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

      // Fetch recent activities
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

      // Sort by timestamp
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
      <MobileLayout>
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Link to="/profile" className="text-muted-foreground hover:text-foreground">
              <ChevronRight className="w-5 h-5 rotate-180" />
            </Link>
            <h1 className="text-lg font-bold">Admin Dashboard</h1>
          </div>
          <Skeleton className="h-32 w-full" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        </div>
      </MobileLayout>
    );
  }

  if (!isAdmin) {
    return (
      <MobileLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-5 text-center">
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
      </MobileLayout>
    );
  }

  const statCards = [
    { 
      label: 'Total Users', 
      value: stats.totalUsers, 
      icon: Users, 
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10' 
    },
    { 
      label: 'Active Courses', 
      value: stats.totalCourses, 
      icon: BookOpen, 
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10' 
    },
    { 
      label: 'Enrollments', 
      value: stats.totalEnrollments, 
      icon: GraduationCap, 
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10' 
    },
    { 
      label: 'Pending Applications', 
      value: stats.pendingApplications, 
      icon: Clock, 
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
      highlight: stats.pendingApplications > 0 
    },
    { 
      label: 'Active Classes', 
      value: stats.activeClasses, 
      icon: Activity, 
      color: 'text-pink-500',
      bgColor: 'bg-pink-500/10' 
    },
    { 
      label: 'Library Items', 
      value: stats.libraryContent, 
      icon: FileText, 
      color: 'text-cyan-500',
      bgColor: 'bg-cyan-500/10' 
    },
  ];

  const quickActions = [
    { 
      label: 'Manage Tutor Applications', 
      description: 'Review and approve new tutors',
      icon: UserCheck, 
      path: '/admin/tutors',
      badge: stats.pendingApplications > 0 ? stats.pendingApplications : undefined
    },
    { 
      label: 'Content Manager', 
      description: 'Manage library content',
      icon: FileText, 
      path: '/admin/content' 
    },
    { 
      label: 'View Analytics', 
      description: 'Study progress and metrics',
      icon: BarChart3, 
      path: '/analytics' 
    },
    { 
      label: 'Academy Settings', 
      description: 'Manage courses and enrollments',
      icon: Settings, 
      path: '/academy' 
    },
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

  return (
    <MobileLayout>
      <div className="p-5 space-y-4 pb-24">
        {/* Back Button and Role Switcher */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link to="/profile" className="text-muted-foreground hover:text-foreground">
              <ChevronRight className="w-5 h-5 rotate-180" />
            </Link>
            <h1 className="text-lg font-bold">Admin Dashboard</h1>
          </div>
          <RoleSwitcher />
        </div>

        {/* Header Banner */}
        <div className="bg-gradient-to-br from-primary/20 via-primary/10 to-background rounded-2xl p-4 border border-primary/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Admin Panel</h1>
              <p className="text-sm text-muted-foreground">LMV Academy Management</p>
            </div>
          </div>
        </div>

        {/* Tabs Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 h-auto">
            <TabsTrigger value="overview" className="text-xs py-2 px-1">
              <BarChart3 className="w-4 h-4 md:mr-1" />
              <span className="hidden md:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="courses" className="text-xs py-2 px-1">
              <BookOpen className="w-4 h-4 md:mr-1" />
              <span className="hidden md:inline">Courses</span>
            </TabsTrigger>
            <TabsTrigger value="tutors" className="text-xs py-2 px-1">
              <UserCheck className="w-4 h-4 md:mr-1" />
              <span className="hidden md:inline">Tutors</span>
            </TabsTrigger>
            <TabsTrigger value="students" className="text-xs py-2 px-1">
              <Users className="w-4 h-4 md:mr-1" />
              <span className="hidden md:inline">Students</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="text-xs py-2 px-1">
              <Settings className="w-4 h-4 md:mr-1" />
              <span className="hidden md:inline">Settings</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4 mt-4">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              {loading ? (
                <>
                  {[1, 2, 3, 4, 5, 6].map(i => (
                    <Skeleton key={i} className="h-24 rounded-xl" />
                  ))}
                </>
              ) : (
                statCards.map((stat, idx) => (
                  <Card 
                    key={idx} 
                    className={cn(
                      "border-border/50",
                      stat.highlight && "border-orange-500/50 bg-orange-500/5"
                    )}
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
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Quick Actions
              </h2>
              {quickActions.map((action, idx) => (
                <Link key={idx} to={action.path}>
                  <Card className="border-border/50 hover:border-primary/30 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <action.icon className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-foreground">{action.label}</p>
                            {action.badge && (
                              <Badge variant="destructive" className="text-xs px-1.5 py-0.5">
                                {action.badge}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">{action.description}</p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>

            {/* Recent Activity */}
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                      <Skeleton key={i} className="h-12" />
                    ))}
                  </div>
                ) : recentActivities.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">
                    No recent activity
                  </p>
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
          </TabsContent>

          {/* Courses Tab */}
          <TabsContent value="courses" className="mt-4">
            <CourseManagement />
          </TabsContent>

          {/* Tutors Tab */}
          <TabsContent value="tutors" className="space-y-4 mt-4">
            <TutorPerformance />
            <Card>
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
                        <p className="text-sm text-muted-foreground">
                          {stats.pendingApplications} pending
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </Link>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Students Tab */}
          <TabsContent value="students" className="mt-4">
            <StudentManagement />
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4 mt-4">
            <AdminManagement />
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="w-5 h-5" />
                  Content Management
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
                        <p className="font-medium">Library Content</p>
                        <p className="text-sm text-muted-foreground">
                          Manage cases, past papers, and materials
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </Link>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MobileLayout>
  );
};

export default AdminDashboardPage;
