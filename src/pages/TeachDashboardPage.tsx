import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  GraduationCap, 
  Users, 
  Bell, 
  Calendar,
  FileText,
  LogOut,
  Plus
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PostUpdateForm from '@/components/teach/PostUpdateForm';
import ScheduleClassForm from '@/components/teach/ScheduleClassForm';
import CourseMaterialsManager from '@/components/teach/CourseMaterialsManager';
import TutorUpdatesList from '@/components/teach/TutorUpdatesList';

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
    upcomingClasses: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [user]);

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
        .from('tutor_updates')
        .select('*', { count: 'exact', head: true })
        .eq('tutor_id', user.id)
        .eq('update_type', 'class')
        .gte('class_time', new Date().toISOString());

      setStats({
        totalStudents: studentsCount || 0,
        totalUpdates: updatesCount || 0,
        upcomingClasses: classesCount || 0
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

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-primary text-primary-foreground shadow-lg">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <GraduationCap className="w-8 h-8" />
            <div>
              <h1 className="text-xl font-bold">Lumina Teach</h1>
              <p className="text-xs opacity-80">Tutor Portal</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={handleSignOut}
            className="text-primary-foreground hover:bg-primary-foreground/10"
          >
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="bg-card">
            <CardContent className="p-4 text-center">
              <Users className="w-8 h-8 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{stats.totalStudents}</p>
              <p className="text-xs text-muted-foreground">Students</p>
            </CardContent>
          </Card>
          <Card className="bg-card">
            <CardContent className="p-4 text-center">
              <Bell className="w-8 h-8 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{stats.totalUpdates}</p>
              <p className="text-xs text-muted-foreground">Updates</p>
            </CardContent>
          </Card>
          <Card className="bg-card">
            <CardContent className="p-4 text-center">
              <Calendar className="w-8 h-8 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{stats.upcomingClasses}</p>
              <p className="text-xs text-muted-foreground">Classes</p>
            </CardContent>
          </Card>
        </div>

        {/* Course Selector */}
        {courses.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Select Course</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {courses.map((course) => (
                  <Button
                    key={course.id}
                    variant={selectedCourse === course.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCourse(course.id)}
                  >
                    {course.name}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Tabs */}
        <Tabs defaultValue="updates" className="space-y-4">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="updates">Updates</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
            <TabsTrigger value="materials">Materials</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="updates" className="space-y-4">
            <PostUpdateForm 
              courseId={selectedCourse} 
              tutorId={user?.id || ''} 
              onSuccess={loadData}
            />
          </TabsContent>

          <TabsContent value="schedule" className="space-y-4">
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
