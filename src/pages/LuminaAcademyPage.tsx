import React, { useState, useEffect } from 'react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { 
  ArrowLeft, 
  GraduationCap, 
  Bell,
  Video,
  Calendar,
  ExternalLink,
  Lock,
  Crown,
  BookOpen
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Course {
  id: string;
  name: string;
  description: string;
  institution: string;
}

interface Enrollment {
  id: string;
  course_id: string;
  status: string;
  expires_at: string;
  course?: Course;
}

interface TutorUpdate {
  id: string;
  course_id: string;
  title: string;
  content: string;
  update_type: string;
  class_link: string | null;
  class_time: string | null;
  created_at: string;
  course_name?: string;
}

const LuminaAcademyPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [updates, setUpdates] = useState<TutorUpdate[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasAcademyAccess, setHasAcademyAccess] = useState(false);

  useEffect(() => {
    loadData();
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel('tutor-updates')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'tutor_updates'
      }, (payload) => {
        loadUpdates();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    await Promise.all([
      loadEnrollments(),
      loadCourses(),
      loadUpdates()
    ]);
    setIsLoading(false);
  };

  const loadEnrollments = async () => {
    const { data } = await supabase
      .from('academy_enrollments')
      .select('*')
      .eq('user_id', user?.id)
      .eq('status', 'active');

    if (data && data.length > 0) {
      setHasAcademyAccess(true);
      setEnrollments(data);
    }
  };

  const loadCourses = async () => {
    const { data } = await supabase
      .from('academy_courses')
      .select('*')
      .eq('is_active', true);

    setCourses(data || []);
  };

  const loadUpdates = async () => {
    const { data } = await supabase
      .from('tutor_updates')
      .select('*')
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(50);

    setUpdates(data || []);
  };

  const getUpdateIcon = (type: string) => {
    switch (type) {
      case 'class': return Video;
      case 'alert': return Bell;
      case 'schedule': return Calendar;
      default: return BookOpen;
    }
  };

  const getUpdateColor = (type: string) => {
    switch (type) {
      case 'class': return 'bg-primary/10 text-primary';
      case 'alert': return 'bg-destructive/10 text-destructive';
      case 'schedule': return 'bg-warning/10 text-warning';
      default: return 'bg-secondary text-foreground';
    }
  };

  if (!hasAcademyAccess) {
    return (
      <MobileLayout showNav={false}>
        <div className="flex flex-col min-h-screen py-6 safe-top">
          <div className="flex items-center gap-4 mb-6">
            <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-secondary transition-colors">
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <h1 className="text-lg font-semibold text-foreground">Lumina Academy</h1>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-6">
              <GraduationCap className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Lumina Academy</h2>
            <p className="text-muted-foreground mb-6">
              Get direct access to your tutors, class schedules, alerts, and learning materials from ZIALE and other institutions.
            </p>
            
            <div className="w-full bg-card rounded-2xl p-4 border border-border/50 mb-6 text-left">
              <h3 className="font-semibold text-foreground mb-3">What you get:</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-primary" />
                  Real-time alerts from your tutors
                </li>
                <li className="flex items-center gap-2">
                  <Video className="w-4 h-4 text-primary" />
                  Direct links to online classes
                </li>
                <li className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  Class schedules and updates
                </li>
                <li className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-primary" />
                  Course-specific materials
                </li>
              </ul>
            </div>

            <Button onClick={() => navigate('/subscription')} className="gradient-primary">
              <Crown className="w-4 h-4 mr-2" />
              Subscribe to Academy
            </Button>
          </div>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout showNav={false}>
      <div className="flex flex-col min-h-screen py-6 safe-top">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-secondary transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div>
            <h1 className="text-lg font-semibold text-foreground">Lumina Academy</h1>
            <p className="text-xs text-muted-foreground">{enrollments.length} courses enrolled</p>
          </div>
        </div>

        <Tabs defaultValue="updates" className="flex-1">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="updates" className="flex-1">Updates</TabsTrigger>
            <TabsTrigger value="courses" className="flex-1">My Courses</TabsTrigger>
          </TabsList>

          <TabsContent value="updates" className="space-y-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : updates.length > 0 ? (
              updates.map((update) => {
                const Icon = getUpdateIcon(update.update_type);
                const colorClass = getUpdateColor(update.update_type);
                const course = courses.find(c => c.id === update.course_id);
                
                return (
                  <div key={update.id} className="bg-card rounded-2xl p-4 border border-border/50">
                    <div className="flex items-start gap-3">
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", colorClass)}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-semibold text-foreground">{update.title}</h3>
                            {course && (
                              <span className="text-xs text-primary">{course.name}</span>
                            )}
                          </div>
                          <span className="text-[10px] text-muted-foreground flex-shrink-0">
                            {new Date(update.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">{update.content}</p>
                        
                        {update.class_time && (
                          <div className="flex items-center gap-2 mt-3 text-sm text-foreground">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            {new Date(update.class_time).toLocaleString()}
                          </div>
                        )}
                        
                        {update.class_link && (
                          <a
                            href={update.class_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 mt-3 text-sm text-primary hover:underline"
                          >
                            <ExternalLink className="w-4 h-4" />
                            Join Class
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-12">
                <Bell className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No updates yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Your tutors will post updates here
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="courses" className="space-y-3">
            {enrollments.map((enrollment) => {
              const course = courses.find(c => c.id === enrollment.course_id);
              if (!course) return null;
              
              return (
                <div key={enrollment.id} className="bg-card rounded-2xl p-4 border border-border/50">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <BookOpen className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">{course.name}</h3>
                      <p className="text-xs text-muted-foreground">{course.institution}</p>
                      {enrollment.expires_at && (
                        <p className="text-xs text-primary mt-1">
                          Expires: {new Date(enrollment.expires_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </TabsContent>
        </Tabs>

        <div className="mt-4 p-4 bg-secondary/50 rounded-2xl">
          <p className="text-xs text-muted-foreground text-center">
            Powered by Lumina Teach • Updates from your tutors appear here in real-time
          </p>
        </div>
      </div>
    </MobileLayout>
  );
};

export default LuminaAcademyPage;
