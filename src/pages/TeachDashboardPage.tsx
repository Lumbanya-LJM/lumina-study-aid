import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { TutorOnboardingTutorial } from '@/components/onboarding/TutorOnboardingTutorial';
import { TutorSidebar } from '@/components/teach/TutorSidebar';
import { RoleSwitcher } from '@/components/layout/RoleSwitcher';
import { StatsDetailModal } from '@/components/teach/StatsDetailModal';
import { EditClassModal } from '@/components/teach/EditClassModal';
import { 
  GraduationCap, 
  Users, 
  Bell, 
  Calendar,
  FileText,
  Plus,
  Video,
  BookOpen,
  Sparkles,
  Clock,
  CheckCircle2,
  BarChart3,
  MessageSquare,
  TrendingUp,
  Mail,
  Pencil,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PostUpdateForm from '@/components/teach/PostUpdateForm';
import ScheduleClassForm from '@/components/teach/ScheduleClassForm';
import CourseMaterialsManager from '@/components/teach/CourseMaterialsManager';
import TutorUpdatesList from '@/components/teach/TutorUpdatesList';
import { TutorProfileEditor } from '@/components/teach/TutorProfileEditor';
import { format } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { cn } from '@/lib/utils';

// Zambia timezone
const ZAMBIA_TIMEZONE = 'Africa/Lusaka';

interface Course {
  id: string;
  name: string;
  description: string | null;
  institution: string | null;
}

interface DashboardStats {
  totalStudents: number;
  totalUpdates: number;
  upcomingClasses: number;
  totalMaterials: number;
  totalClassesCompleted: number;
  avgAttendance: number;
}

interface EnrolledStudent {
  id: string;
  user_id: string;
  enrolled_at: string;
  status: string;
  profile?: {
    full_name: string | null;
    university: string | null;
  };
}

interface ScheduledClass {
  id: string;
  title: string;
  description: string | null;
  scheduled_at: string;
  status: string;
  course_id: string;
  course_name?: string;
}

const TeachDashboardPage: React.FC = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    totalUpdates: 0,
    upcomingClasses: 0,
    totalMaterials: 0,
    totalClassesCompleted: 0,
    avgAttendance: 0
  });
  const [scheduledClasses, setScheduledClasses] = useState<ScheduledClass[]>([]);
  const [enrolledStudents, setEnrolledStudents] = useState<EnrolledStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(() => {
    return !localStorage.getItem('luminary_tutor_onboarding_complete');
  });
  
  // Modal states
  const [statsModalOpen, setStatsModalOpen] = useState(false);
  const [statsModalType, setStatsModalType] = useState<'students' | 'updates' | 'upcoming' | 'completed' | 'attendance' | 'materials' | null>(null);
  const [editClassModalOpen, setEditClassModalOpen] = useState(false);
  const [editingClassId, setEditingClassId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [user]);

  useEffect(() => {
    if (selectedCourse) {
      loadEnrolledStudents();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCourse]);

  const loadData = async () => {
    if (!user) return;
    
    try {
      const { data: coursesData, error: coursesError } = await supabase
        .from('academy_courses')
        .select('*')
        .eq('is_active', true);

      if (coursesError) throw coursesError;
      setCourses(coursesData || []);
      
      if (coursesData && coursesData.length > 0) {
        setSelectedCourse(coursesData[0].id);
      }

      const { count: studentsCount } = await supabase
        .from('academy_enrollments')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      const { count: updatesCount } = await supabase
        .from('tutor_updates')
        .select('*', { count: 'exact', head: true })
        .eq('tutor_id', user.id);

      const { count: classesCount } = await supabase
        .from('live_classes')
        .select('*', { count: 'exact', head: true })
        .eq('host_id', user.id)
        .eq('status', 'scheduled')
        .gte('scheduled_at', new Date().toISOString());

      const { count: completedClassesCount } = await supabase
        .from('live_classes')
        .select('*', { count: 'exact', head: true })
        .eq('host_id', user.id)
        .eq('status', 'ended');

      const { count: materialsCount } = await supabase
        .from('library_content')
        .select('*', { count: 'exact', head: true })
        .eq('is_published', true);

      const { data: attendanceData } = await supabase
        .from('class_participants')
        .select('class_id, duration_seconds, live_classes!inner(host_id)')
        .eq('live_classes.host_id', user.id);

      const totalAttendees = attendanceData?.length || 0;
      const avgAttendance = completedClassesCount && completedClassesCount > 0 
        ? Math.round(totalAttendees / completedClassesCount) 
        : 0;

      const { data: upcomingClassesData } = await supabase
        .from('live_classes')
        .select('id, title, description, scheduled_at, status, course_id')
        .eq('host_id', user.id)
        .in('status', ['scheduled', 'live'])
        .gte('scheduled_at', new Date().toISOString())
        .order('scheduled_at', { ascending: true })
        .limit(5);

      if (upcomingClassesData) {
        const classesWithCourseNames = upcomingClassesData.map(cls => ({
          ...cls,
          course_name: coursesData?.find(c => c.id === cls.course_id)?.name || 'Unknown Course'
        }));
        setScheduledClasses(classesWithCourseNames);
      }

      setStats({
        totalStudents: studentsCount || 0,
        totalUpdates: updatesCount || 0,
        upcomingClasses: classesCount || 0,
        totalMaterials: materialsCount || 0,
        totalClassesCompleted: completedClassesCount || 0,
        avgAttendance
      });
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load dashboard data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadEnrolledStudents = async () => {
    if (!selectedCourse) return;
    
    setLoadingStudents(true);
    try {
      const { data: enrollments, error } = await supabase
        .from('academy_enrollments')
        .select('id, user_id, enrolled_at, status')
        .eq('course_id', selectedCourse)
        .eq('status', 'active')
        .order('enrolled_at', { ascending: false });

      if (error) throw error;

      if (enrollments && enrollments.length > 0) {
        const userIds = enrollments.map(e => e.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, university')
          .in('user_id', userIds);

        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
        
        const studentsWithProfiles = enrollments.map(e => ({
          ...e,
          profile: profileMap.get(e.user_id) || null
        }));

        setEnrolledStudents(studentsWithProfiles);
      } else {
        setEnrolledStudents([]);
      }
    } catch (error) {
      console.error('Error loading students:', error);
    } finally {
      setLoadingStudents(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading Lumina Teach...</p>
        </div>
      </div>
    );
  }

  const selectedCourseName = courses.find(c => c.id === selectedCourse)?.name || '';

  if (showOnboarding) {
    return <TutorOnboardingTutorial onComplete={() => setShowOnboarding(false)} />;
  }

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Stats Cards - Clickable */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card 
          className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20 cursor-pointer hover:border-blue-500/40 transition-colors"
          onClick={() => { setStatsModalType('students'); setStatsModalOpen(true); }}
        >
          <CardContent className="p-4 text-center">
            <Users className="w-6 h-6 mx-auto mb-2 text-blue-500" />
            <p className="text-2xl font-bold text-blue-500">{stats.totalStudents}</p>
            <p className="text-xs text-muted-foreground">Students</p>
          </CardContent>
        </Card>
        <Card 
          className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20 cursor-pointer hover:border-purple-500/40 transition-colors"
          onClick={() => { setStatsModalType('updates'); setStatsModalOpen(true); }}
        >
          <CardContent className="p-4 text-center">
            <Bell className="w-6 h-6 mx-auto mb-2 text-purple-500" />
            <p className="text-2xl font-bold text-purple-500">{stats.totalUpdates}</p>
            <p className="text-xs text-muted-foreground">Updates</p>
          </CardContent>
        </Card>
        <Card 
          className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20 cursor-pointer hover:border-emerald-500/40 transition-colors"
          onClick={() => { setStatsModalType('upcoming'); setStatsModalOpen(true); }}
        >
          <CardContent className="p-4 text-center">
            <Video className="w-6 h-6 mx-auto mb-2 text-emerald-500" />
            <p className="text-2xl font-bold text-emerald-500">{stats.upcomingClasses}</p>
            <p className="text-xs text-muted-foreground">Upcoming</p>
          </CardContent>
        </Card>
        <Card 
          className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20 cursor-pointer hover:border-green-500/40 transition-colors"
          onClick={() => { setStatsModalType('completed'); setStatsModalOpen(true); }}
        >
          <CardContent className="p-4 text-center">
            <CheckCircle2 className="w-6 h-6 mx-auto mb-2 text-green-500" />
            <p className="text-2xl font-bold text-green-500">{stats.totalClassesCompleted}</p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
        <Card 
          className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20 cursor-pointer hover:border-orange-500/40 transition-colors"
          onClick={() => { setStatsModalType('attendance'); setStatsModalOpen(true); }}
        >
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-6 h-6 mx-auto mb-2 text-orange-500" />
            <p className="text-2xl font-bold text-orange-500">{stats.avgAttendance}</p>
            <p className="text-xs text-muted-foreground">Avg Attendance</p>
          </CardContent>
        </Card>
        <Card 
          className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border-cyan-500/20 cursor-pointer hover:border-cyan-500/40 transition-colors"
          onClick={() => { setStatsModalType('materials'); setStatsModalOpen(true); }}
        >
          <CardContent className="p-4 text-center">
            <FileText className="w-6 h-6 mx-auto mb-2 text-cyan-500" />
            <p className="text-2xl font-bold text-cyan-500">{stats.totalMaterials}</p>
            <p className="text-xs text-muted-foreground">Materials</p>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Classes */}
      {scheduledClasses.length > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Upcoming Classes
            </CardTitle>
            <CardDescription>Your scheduled live sessions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {scheduledClasses.map((cls) => (
                <div
                  key={cls.id}
                  className="flex items-center justify-between p-3 bg-background rounded-lg border border-border/50 group"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center",
                      cls.status === 'live' ? "bg-red-500/20" : "bg-primary/10"
                    )}>
                      <Video className={cn(
                        "w-5 h-5",
                        cls.status === 'live' ? "text-red-500" : "text-primary"
                      )} />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{cls.title}</p>
                      <p className="text-xs text-muted-foreground">{cls.course_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      {cls.status === 'live' ? (
                        <Badge variant="destructive" className="animate-pulse">LIVE</Badge>
                      ) : (
                        <Badge variant="secondary">Scheduled</Badge>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatInTimeZone(new Date(cls.scheduled_at), ZAMBIA_TIMEZONE, 'MMM d, h:mm a')} CAT
                      </p>
                    </div>
                    {cls.status !== 'live' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => {
                          setEditingClassId(cls.id);
                          setEditClassModalOpen(true);
                        }}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setActiveTab('updates')}>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-purple-500/10 rounded-xl">
              <Bell className="w-6 h-6 text-purple-500" />
            </div>
            <div>
              <h3 className="font-semibold">Post Update</h3>
              <p className="text-sm text-muted-foreground">Share announcements with students</p>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setActiveTab('live')}>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 rounded-xl">
              <Video className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <h3 className="font-semibold">Schedule Class</h3>
              <p className="text-sm text-muted-foreground">Plan your next live session</p>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setActiveTab('materials')}>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-cyan-500/10 rounded-xl">
              <FileText className="w-6 h-6 text-cyan-500" />
            </div>
            <div>
              <h3 className="font-semibold">Upload Materials</h3>
              <p className="text-sm text-muted-foreground">Share course resources</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderAnalytics = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Teaching Analytics
          </CardTitle>
          <CardDescription>Your teaching performance overview</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-muted/50 rounded-lg text-center">
              <p className="text-3xl font-bold text-primary">{stats.totalClassesCompleted}</p>
              <p className="text-sm text-muted-foreground">Total Classes</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg text-center">
              <p className="text-3xl font-bold text-primary">{stats.totalStudents}</p>
              <p className="text-sm text-muted-foreground">Total Students</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg text-center">
              <p className="text-3xl font-bold text-primary">{stats.avgAttendance}</p>
              <p className="text-sm text-muted-foreground">Avg. Attendance</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg text-center">
              <p className="text-3xl font-bold text-primary">{stats.totalMaterials}</p>
              <p className="text-sm text-muted-foreground">Materials Shared</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderMessages = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Student Communications
          </CardTitle>
          <CardDescription>Messages and inquiries from your students</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Mail className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">No Messages Yet</h3>
            <p className="text-sm text-muted-foreground">
              Student messages will appear here when they reach out
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderSchedule = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Class Schedule
          </CardTitle>
          <CardDescription>Your upcoming teaching schedule</CardDescription>
        </CardHeader>
        <CardContent>
          {scheduledClasses.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">No Scheduled Classes</h3>
              <p className="text-sm text-muted-foreground mb-4">
                You don't have any upcoming classes scheduled
              </p>
              <Button onClick={() => setActiveTab('live')}>
                <Plus className="w-4 h-4 mr-2" />
                Schedule a Class
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {scheduledClasses.map((cls) => (
                <div
                  key={cls.id}
                  className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Video className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{cls.title}</p>
                      <p className="text-sm text-muted-foreground">{cls.course_name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{format(new Date(cls.scheduled_at), 'MMM d, yyyy')}</p>
                    <p className="text-sm text-muted-foreground">{format(new Date(cls.scheduled_at), 'h:mm a')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderStudents = () => (
    <div className="space-y-6">
      {/* Course Selector */}
      {courses.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Select Course
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="w-full whitespace-nowrap">
              <div className="flex gap-2">
                {courses.map((course) => (
                  <Button
                    key={course.id}
                    variant={selectedCourse === course.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCourse(course.id)}
                    className="shrink-0"
                  >
                    {course.name}
                    {selectedCourse === course.id && (
                      <CheckCircle2 className="w-3 h-3 ml-1" />
                    )}
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Engagement Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-500">{enrolledStudents.length}</p>
            <p className="text-xs text-muted-foreground">Enrolled</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-500">{stats.avgAttendance}</p>
            <p className="text-xs text-muted-foreground">Avg Attendance</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-purple-500">{stats.totalClassesCompleted}</p>
            <p className="text-xs text-muted-foreground">Classes Held</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Enrolled Students
          </CardTitle>
          <CardDescription>
            Students enrolled in {selectedCourseName}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingStudents ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : enrolledStudents.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No students enrolled yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {enrolledStudents.map((student) => (
                <div
                  key={student.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-primary font-semibold">
                        {student.profile?.full_name?.charAt(0) || '?'}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-sm">
                        {student.profile?.full_name || 'Unknown Student'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {student.profile?.university || 'No university'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary" className="text-xs">
                      Active
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(student.enrolled_at), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview();
      case 'updates':
        return (
          <PostUpdateForm 
            courseId={selectedCourse} 
            tutorId={user?.id || ''} 
            onSuccess={loadData}
          />
        );
      case 'live':
        return (
          <ScheduleClassForm 
            courseId={selectedCourse} 
            tutorId={user?.id || ''} 
            onSuccess={loadData}
          />
        );
      case 'materials':
        return <CourseMaterialsManager courseId={selectedCourse} />;
      case 'students':
        return renderStudents();
      case 'history':
        return <TutorUpdatesList courseId={selectedCourse} tutorId={user?.id || ''} />;
      case 'analytics':
        return renderAnalytics();
      case 'messages':
        return renderMessages();
      case 'schedule':
        return renderSchedule();
      case 'profile':
        return <TutorProfileEditor />;
      default:
        return renderOverview();
    }
  };

  const getPageTitle = () => {
    switch (activeTab) {
      case 'overview': return 'Dashboard Overview';
      case 'updates': return 'Post Updates';
      case 'live': return 'Live Classes';
      case 'materials': return 'Course Materials';
      case 'students': return 'Students';
      case 'history': return 'Class History';
      case 'analytics': return 'Analytics';
      case 'messages': return 'Messages';
      case 'schedule': return 'Schedule';
      case 'profile': return 'Tutor Profile';
      default: return 'Dashboard';
    }
  };

  return (
    <div className="min-h-screen flex w-full bg-background">
      <TutorSidebar activeTab={activeTab} onTabChange={setActiveTab} />
      
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-40 h-14 border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center justify-between h-full px-4">
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-semibold">{getPageTitle()}</h1>
            </div>
            <div className="flex items-center gap-2">
              <RoleSwitcher />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-6 overflow-auto">
          {/* Course Selector - Show for relevant tabs */}
          {['updates', 'live', 'materials'].includes(activeTab) && courses.length > 0 && (
            <Card className="mb-6">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  Select Course
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="w-full whitespace-nowrap">
                  <div className="flex gap-2">
                    {courses.map((course) => (
                      <Button
                        key={course.id}
                        variant={selectedCourse === course.id ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedCourse(course.id)}
                        className="shrink-0"
                      >
                        {course.name}
                        {selectedCourse === course.id && (
                          <CheckCircle2 className="w-3 h-3 ml-1" />
                        )}
                      </Button>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
          
          {renderContent()}
        </main>
      </div>
      
      {/* Stats Detail Modal */}
      <StatsDetailModal
        open={statsModalOpen}
        onOpenChange={setStatsModalOpen}
        statType={statsModalType}
      />
      
      {/* Edit Class Modal */}
      <EditClassModal
        open={editClassModalOpen}
        onOpenChange={setEditClassModalOpen}
        classId={editingClassId}
        onSuccess={loadData}
      />
    </div>
  );
};

export default TeachDashboardPage;
