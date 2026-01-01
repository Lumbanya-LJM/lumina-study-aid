import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { TutorOnboardingTutorial } from '@/components/onboarding/TutorOnboardingTutorial';
import { TutorSidebar } from '@/components/teach/TutorSidebar';
import { RoleSwitcher } from '@/components/layout/RoleSwitcher';
import { StatsDetailModal } from '@/components/teach/StatsDetailModal';
import { EditClassModal } from '@/components/teach/EditClassModal';
import { ClearStatsDialog } from '@/components/admin/ClearStatsDialog';
import { StatsHistoryModal } from '@/components/admin/StatsHistoryModal';
import { toast as sonnerToast } from 'sonner';
import { useSchoolTheme } from '@/hooks/useSchoolTheme';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
  Play,
  ExternalLink,
  PhoneOff,
  Loader2,
  Trash2,
  History,
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
  started_at: string | null;
  status: string;
  course_id: string;
  course_name?: string;
  daily_room_url: string | null;
  daily_room_name: string | null;
}

// Live duration timer component
const LiveDurationTimer: React.FC<{ startedAt: string }> = ({ startedAt }) => {
  const [duration, setDuration] = useState('');

  useEffect(() => {
    const updateDuration = () => {
      const start = new Date(startedAt).getTime();
      const now = Date.now();
      const diff = Math.max(0, now - start);
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      if (hours > 0) {
        setDuration(`${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      } else {
        setDuration(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      }
    };

    updateDuration();
    const interval = setInterval(updateDuration, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  return (
    <span className="inline-flex items-center gap-1 text-xs font-mono text-red-500">
      <Clock className="w-3 h-3" />
      {duration}
    </span>
  );
};

// Countdown timer for upcoming classes
const CountdownTimer: React.FC<{ scheduledAt: string }> = ({ scheduledAt }) => {
  const [countdown, setCountdown] = useState('');
  const [isOverdue, setIsOverdue] = useState(false);

  useEffect(() => {
    const updateCountdown = () => {
      const scheduled = new Date(scheduledAt).getTime();
      const now = Date.now();
      const diff = scheduled - now;
      
      if (diff <= 0) {
        setIsOverdue(true);
        setCountdown('Now');
        return;
      }
      
      setIsOverdue(false);
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      if (hours > 0) {
        setCountdown(`${hours}h ${minutes}m`);
      } else if (minutes > 0) {
        setCountdown(`${minutes}m ${seconds}s`);
      } else {
        setCountdown(`${seconds}s`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [scheduledAt]);

  return (
    <span className={cn(
      "inline-flex items-center gap-1 text-xs font-mono",
      isOverdue ? "text-amber-500" : "text-emerald-500"
    )}>
      <Clock className="w-3 h-3" />
      {countdown}
    </span>
  );
};

const TeachDashboardPage: React.FC = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // Apply school-specific theme colors
  useSchoolTheme();
  
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
  const [endingClassId, setEndingClassId] = useState<string | null>(null);
  const [endClassConfirmOpen, setEndClassConfirmOpen] = useState(false);
  const [classToEnd, setClassToEnd] = useState<{ id: string; title: string; dailyRoomName: string | null } | null>(null);
  const [clearStatsOpen, setClearStatsOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);

  useEffect(() => {
    loadData();
    
    // Auto-refresh class statuses every 30 seconds
    const refreshInterval = setInterval(() => {
      loadData();
    }, 30000);
    
    return () => clearInterval(refreshInterval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
      // First, get the tutor's approved application to find their assigned courses
      const { data: tutorApp } = await supabase
        .from('tutor_applications')
        .select('selected_courses')
        .eq('user_id', user.id)
        .eq('status', 'approved')
        .single();

      const tutorCourseValues = tutorApp?.selected_courses || [];

      // If tutor has assigned courses, filter by them; otherwise show empty
      // Note: selected_courses may contain course names OR UUIDs (legacy data)
      // We need to check both formats for compatibility
      let coursesData: Course[] = [];
      if (tutorCourseValues.length > 0) {
        // Separate potential UUIDs from course names
        const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const courseIds = tutorCourseValues.filter(v => uuidPattern.test(v));
        const courseNames = tutorCourseValues.filter(v => !uuidPattern.test(v));
        
        // Query by both IDs and names
        let query = supabase
          .from('academy_courses')
          .select('*')
          .eq('is_active', true);
        
        if (courseIds.length > 0 && courseNames.length > 0) {
          // Has both UUIDs and names - use OR filter
          query = query.or(`id.in.(${courseIds.join(',')}),name.in.(${courseNames.join(',')})`);
        } else if (courseIds.length > 0) {
          query = query.in('id', courseIds);
        } else {
          query = query.in('name', courseNames);
        }

        const { data, error: coursesError } = await query;

        if (coursesError) throw coursesError;
        coursesData = data || [];
      }

      setCourses(coursesData);
      
      if (coursesData.length > 0) {
        setSelectedCourse(coursesData[0].id);
      }

      // Count students only for this tutor's assigned courses
      let studentsCount = 0;
      if (coursesData.length > 0) {
        const courseIds = coursesData.map(c => c.id);
        const { count } = await supabase
          .from('academy_enrollments')
          .select('*', { count: 'exact', head: true })
          .in('course_id', courseIds)
          .eq('status', 'active');
        studentsCount = count || 0;
      }

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
        .select('id, title, description, scheduled_at, started_at, status, course_id, daily_room_url, daily_room_name')
        .eq('host_id', user.id)
        .in('status', ['scheduled', 'live'])
        .order('scheduled_at', { ascending: true })
        .limit(10);

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

  const openEndClassConfirm = (classId: string, title: string, dailyRoomName: string | null) => {
    setClassToEnd({ id: classId, title, dailyRoomName });
    setEndClassConfirmOpen(true);
  };

  const handleConfirmEndClass = async () => {
    if (!classToEnd) return;
    
    setEndClassConfirmOpen(false);
    await handleEndClass(classToEnd.id, classToEnd.dailyRoomName);
    setClassToEnd(null);
  };

  const handleEndClass = async (classId: string, dailyRoomName: string | null) => {
    if (endingClassId) return; // Prevent double-click
    
    setEndingClassId(classId);
    
    try {
      // Stop recording via Daily.co API if room exists
      if (dailyRoomName) {
        console.log("Stopping recording for room:", dailyRoomName);
        await supabase.functions.invoke("daily-room", {
          body: {
            action: "stop-recording",
            roomName: dailyRoomName,
          },
        });
      }

      // Update class status to ended
      const { error: updateError } = await supabase
        .from("live_classes")
        .update({
          status: "ended",
          ended_at: new Date().toISOString(),
        })
        .eq("id", classId);

      if (updateError) throw updateError;

      // Trigger auto-create for recurring classes
      const { data: recurringResult, error: recurringError } = await supabase.functions.invoke(
        "auto-create-recurring-class",
        { body: { classId } }
      );

      if (recurringError) {
        console.error("Failed to auto-create recurring class:", recurringError);
      } else if (recurringResult?.newClassId) {
        toast({
          title: "Next Class Scheduled",
          description: "Your next recurring class has been automatically scheduled.",
        });
      }

      toast({
        title: "Class Ended",
        description: "The class has been ended successfully.",
      });

      // Refresh the data
      loadData();
    } catch (error) {
      console.error("Error ending class:", error);
      toast({
        title: "Error",
        description: "Failed to end class. Please try again.",
        variant: "destructive",
      });
    } finally {
      setEndingClassId(null);
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
      {/* Stats Header with Actions */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Your Stats</h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setHistoryModalOpen(true)}
            className="gap-1"
          >
            <History className="w-4 h-4" />
            History
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setClearStatsOpen(true)}
            className="gap-1 text-destructive hover:text-destructive"
          >
            <Trash2 className="w-4 h-4" />
            Clear Stats
          </Button>
        </div>
      </div>

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
              {scheduledClasses.map((cls) => {
                const classDate = new Date(cls.scheduled_at);
                const now = new Date();
                const isToday = classDate.toDateString() === now.toDateString();
                const isStartingSoon = classDate.getTime() - now.getTime() <= 30 * 60 * 1000; // Within 30 mins
                const isLive = cls.status === 'live';
                const canStart = isToday || isStartingSoon || isLive;

                return (
                  <div
                    key={cls.id}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border group",
                      isLive ? "bg-red-500/10 border-red-500/30" :
                      isStartingSoon ? "bg-emerald-500/10 border-emerald-500/30" :
                      isToday ? "bg-primary/10 border-primary/30" :
                      "bg-background border-border/50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center",
                        isLive ? "bg-red-500/20" :
                        isStartingSoon ? "bg-emerald-500/20" :
                        "bg-primary/10"
                      )}>
                        <Video className={cn(
                          "w-5 h-5",
                          isLive ? "text-red-500" :
                          isStartingSoon ? "text-emerald-500" :
                          "text-primary"
                        )} />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{cls.title}</p>
                        <p className="text-xs text-muted-foreground">{cls.course_name}</p>
                        {isToday && !isLive && (
                          <p className="text-xs font-medium text-primary mt-0.5">
                            {isStartingSoon ? '🔔 Starting soon!' : '📅 Today'}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        {isLive ? (
                          <div className="flex flex-col items-end gap-1">
                            <Badge variant="destructive" className="animate-pulse">LIVE</Badge>
                            {cls.started_at && <LiveDurationTimer startedAt={cls.started_at} />}
                          </div>
                        ) : isStartingSoon ? (
                          <div className="flex flex-col items-end gap-1">
                            <Badge className="bg-emerald-500 hover:bg-emerald-600">Ready</Badge>
                            <CountdownTimer scheduledAt={cls.scheduled_at} />
                          </div>
                        ) : isToday ? (
                          <div className="flex flex-col items-end gap-1">
                            <Badge variant="secondary" className="bg-primary/20 text-primary">Today</Badge>
                            <CountdownTimer scheduledAt={cls.scheduled_at} />
                          </div>
                        ) : (
                          <div className="flex flex-col items-end gap-1">
                            <Badge variant="secondary">Scheduled</Badge>
                            <p className="text-xs text-muted-foreground">
                              {formatInTimeZone(new Date(cls.scheduled_at), ZAMBIA_TIMEZONE, 'MMM d, h:mm a')} CAT
                            </p>
                          </div>
                        )}
                      </div>
                      
                      {/* Start/Join Class Button */}
                      {canStart && !isLive && (
                        <Button
                          size="sm"
                          variant="default"
                          className="gap-1.5 gradient-primary"
                          onClick={() => navigate(`/class/${cls.id}`)}
                        >
                          <Play className="w-3.5 h-3.5" />
                          Start
                        </Button>
                      )}

                      {/* Join Class Button for live classes */}
                      {isLive && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5"
                          onClick={() => navigate(`/class/${cls.id}`)}
                        >
                          <Play className="w-3.5 h-3.5" />
                          Join
                        </Button>
                      )}

                      {/* End Class Button for live classes */}
                      {isLive && (
                        <Button
                          size="sm"
                          variant="destructive"
                          className="gap-1.5"
                          disabled={endingClassId === cls.id}
                          onClick={() => openEndClassConfirm(cls.id, cls.title, cls.daily_room_name)}
                        >
                          {endingClassId === cls.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <PhoneOff className="w-3.5 h-3.5" />
                          )}
                          End
                        </Button>
                      )}
                      
                      {/* Edit button for non-live classes */}
                      {!isLive && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className={cn(
                            "transition-opacity",
                            !canStart && "opacity-0 group-hover:opacity-100"
                          )}
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
                );
              })}
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
              {scheduledClasses.map((cls) => {
                const classDate = new Date(cls.scheduled_at);
                const now = new Date();
                const isToday = classDate.toDateString() === now.toDateString();
                const isStartingSoon = classDate.getTime() - now.getTime() <= 30 * 60 * 1000;
                const isLive = cls.status === 'live';
                const canStart = isToday || isStartingSoon || isLive;

                return (
                  <div
                    key={cls.id}
                    className={cn(
                      "flex items-center justify-between p-4 rounded-lg",
                      isLive ? "bg-red-500/10 border border-red-500/30" :
                      isStartingSoon ? "bg-emerald-500/10 border border-emerald-500/30" :
                      isToday ? "bg-primary/10 border border-primary/30" :
                      "bg-muted/50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-12 h-12 rounded-lg flex items-center justify-center",
                        isLive ? "bg-red-500/20" :
                        isStartingSoon ? "bg-emerald-500/20" :
                        "bg-primary/10"
                      )}>
                        <Video className={cn(
                          "w-6 h-6",
                          isLive ? "text-red-500" :
                          isStartingSoon ? "text-emerald-500" :
                          "text-primary"
                        )} />
                      </div>
                      <div>
                        <p className="font-medium">{cls.title}</p>
                        <p className="text-sm text-muted-foreground">{cls.course_name}</p>
                        {isToday && !isLive && (
                          <p className="text-xs font-medium text-primary mt-0.5">
                            {isStartingSoon ? '🔔 Starting soon!' : '📅 Today'}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        {isLive ? (
                          <div className="flex flex-col items-end gap-1">
                            <Badge variant="destructive" className="animate-pulse">LIVE</Badge>
                            {cls.started_at && <LiveDurationTimer startedAt={cls.started_at} />}
                          </div>
                        ) : isStartingSoon ? (
                          <div className="flex flex-col items-end gap-1">
                            <Badge className="bg-emerald-500 hover:bg-emerald-600">Ready</Badge>
                            <CountdownTimer scheduledAt={cls.scheduled_at} />
                          </div>
                        ) : isToday ? (
                          <div className="flex flex-col items-end gap-1">
                            <Badge variant="secondary" className="bg-primary/20 text-primary">Today</Badge>
                            <CountdownTimer scheduledAt={cls.scheduled_at} />
                          </div>
                        ) : (
                          <div className="flex flex-col items-end gap-1">
                            <Badge variant="secondary">Scheduled</Badge>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(cls.scheduled_at), 'MMM d, h:mm a')}
                            </p>
                          </div>
                        )}
                      </div>
                      
                      {/* Start Button for scheduled classes */}
                      {canStart && !isLive && (
                        <Button
                          variant="default"
                          className="gap-2 gradient-primary"
                          onClick={() => navigate(`/class/${cls.id}`)}
                        >
                          <Play className="w-4 h-4" />
                          Start Class
                        </Button>
                      )}

                      {/* Join and End buttons for live classes */}
                      {isLive && (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            className="gap-2"
                            onClick={() => navigate(`/class/${cls.id}`)}
                          >
                            <Play className="w-4 h-4" />
                            Join
                          </Button>
                          <Button
                            variant="destructive"
                            className="gap-2"
                            disabled={endingClassId === cls.id}
                            onClick={() => openEndClassConfirm(cls.id, cls.title, cls.daily_room_name)}
                          >
                            {endingClassId === cls.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <PhoneOff className="w-4 h-4" />
                            )}
                            End Class
                          </Button>
                        </div>
                      )}
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
            <ScrollArea className="w-full whitespace-nowrap pb-2">
              <div className="flex gap-2 pb-1">
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
              <ScrollBar orientation="horizontal" />
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
                <ScrollArea className="w-full whitespace-nowrap pb-2">
                  <div className="flex gap-2 pb-1">
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
                  <ScrollBar orientation="horizontal" />
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

      {/* End Class Confirmation Dialog */}
      <AlertDialog open={endClassConfirmOpen} onOpenChange={setEndClassConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>End Class?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to end <span className="font-semibold">"{classToEnd?.title}"</span>? 
              This will stop the class for all participants and the recording will be processed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setClassToEnd(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmEndClass}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              End Class
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear Stats Dialog */}
      <ClearStatsDialog
        open={clearStatsOpen}
        onOpenChange={setClearStatsOpen}
        dashboardType="tutor"
        currentStats={stats}
        onClear={async () => {
          // Tutor stats are derived from activities - snapshot saved for historical record
          sonnerToast.success('Stats snapshot saved. Your stats reflect your activity history.');
        }}
      />

      {/* Stats History Modal */}
      <StatsHistoryModal
        open={historyModalOpen}
        onOpenChange={setHistoryModalOpen}
        dashboardType="tutor"
      />
    </div>
  );
};

export default TeachDashboardPage;
