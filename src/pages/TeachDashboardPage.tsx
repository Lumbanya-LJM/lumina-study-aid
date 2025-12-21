import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { 
  GraduationCap, 
  Users, 
  Bell, 
  Calendar,
  FileText,
  LogOut,
  Plus,
  Video,
  BookOpen,
  ArrowLeft,
  Sparkles,
  Mail,
  Clock,
  CheckCircle2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PostUpdateForm from '@/components/teach/PostUpdateForm';
import ScheduleClassForm from '@/components/teach/ScheduleClassForm';
import CourseMaterialsManager from '@/components/teach/CourseMaterialsManager';
import TutorUpdatesList from '@/components/teach/TutorUpdatesList';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

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

const TeachDashboardPage: React.FC = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    totalUpdates: 0,
    upcomingClasses: 0,
    totalMaterials: 0
  });
  const [enrolledStudents, setEnrolledStudents] = useState<EnrolledStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);

  useEffect(() => {
    loadData();
  }, [user]);

  useEffect(() => {
    if (selectedCourse) {
      loadEnrolledStudents();
    }
  }, [selectedCourse]);

  const loadData = async () => {
    if (!user) return;
    
    try {
      // Load courses
      const { data: coursesData, error: coursesError } = await supabase
        .from('academy_courses')
        .select('*')
        .eq('is_active', true);

      if (coursesError) throw coursesError;
      setCourses(coursesData || []);
      
      if (coursesData && coursesData.length > 0) {
        setSelectedCourse(coursesData[0].id);
      }

      // Load stats
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

      const { count: materialsCount } = await supabase
        .from('library_content')
        .select('*', { count: 'exact', head: true })
        .eq('is_published', true);

      setStats({
        totalStudents: studentsCount || 0,
        totalUpdates: updatesCount || 0,
        upcomingClasses: classesCount || 0,
        totalMaterials: materialsCount || 0
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
      // Get enrollments for this course
      const { data: enrollments, error } = await supabase
        .from('academy_enrollments')
        .select('id, user_id, enrolled_at, status')
        .eq('course_id', selectedCourse)
        .eq('status', 'active')
        .order('enrolled_at', { ascending: false });

      if (error) throw error;

      // Get profiles for enrolled users
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

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-primary text-primary-foreground shadow-lg">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-foreground/10 rounded-xl">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Lumina Teach</h1>
              <p className="text-xs opacity-80">Tutor Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate('/home')}
              className="text-primary-foreground hover:bg-primary-foreground/10"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Student App
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={handleSignOut}
              className="text-primary-foreground hover:bg-primary-foreground/10"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6 pb-24">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-card border-border/50">
            <CardContent className="p-4 text-center">
              <Users className="w-8 h-8 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{stats.totalStudents}</p>
              <p className="text-xs text-muted-foreground">Students</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border/50">
            <CardContent className="p-4 text-center">
              <Bell className="w-8 h-8 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{stats.totalUpdates}</p>
              <p className="text-xs text-muted-foreground">Updates</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border/50">
            <CardContent className="p-4 text-center">
              <Video className="w-8 h-8 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{stats.upcomingClasses}</p>
              <p className="text-xs text-muted-foreground">Scheduled</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border/50">
            <CardContent className="p-4 text-center">
              <FileText className="w-8 h-8 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{stats.totalMaterials}</p>
              <p className="text-xs text-muted-foreground">Materials</p>
            </CardContent>
          </Card>
        </div>

        {/* Course Selector */}
        {courses.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Select Course
              </CardTitle>
              <CardDescription>Choose a course to manage</CardDescription>
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

        {/* Main Tabs */}
        <Tabs defaultValue="updates" className="space-y-4">
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="updates" className="text-xs">
              <Bell className="w-4 h-4 mr-1 hidden sm:inline" />
              Updates
            </TabsTrigger>
            <TabsTrigger value="live" className="text-xs">
              <Video className="w-4 h-4 mr-1 hidden sm:inline" />
              Live Class
            </TabsTrigger>
            <TabsTrigger value="materials" className="text-xs">
              <FileText className="w-4 h-4 mr-1 hidden sm:inline" />
              Materials
            </TabsTrigger>
            <TabsTrigger value="students" className="text-xs">
              <Users className="w-4 h-4 mr-1 hidden sm:inline" />
              Students
            </TabsTrigger>
            <TabsTrigger value="history" className="text-xs">
              <Clock className="w-4 h-4 mr-1 hidden sm:inline" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="updates" className="space-y-4">
            <PostUpdateForm 
              courseId={selectedCourse} 
              tutorId={user?.id || ''} 
              onSuccess={loadData}
            />
          </TabsContent>

          <TabsContent value="live" className="space-y-4">
            <ScheduleClassForm 
              courseId={selectedCourse} 
              tutorId={user?.id || ''} 
              onSuccess={loadData}
            />
          </TabsContent>

          <TabsContent value="materials" className="space-y-4">
            <CourseMaterialsManager 
              courseId={selectedCourse}
            />
          </TabsContent>

          <TabsContent value="students" className="space-y-4">
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
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <TutorUpdatesList 
              courseId={selectedCourse}
              tutorId={user?.id || ''}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default TeachDashboardPage;
