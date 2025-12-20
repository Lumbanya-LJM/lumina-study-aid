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
  BookOpen,
  Users,
  Play,
  Clock
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, formatDistanceToNow } from 'date-fns';

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

interface LiveClass {
  id: string;
  title: string;
  description: string | null;
  status: string;
  scheduled_at: string | null;
  started_at: string | null;
  daily_room_name: string | null;
  course_id: string | null;
  host_id: string;
  academy_courses?: { name: string } | null;
}

const LuminaAcademyPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [updates, setUpdates] = useState<TutorUpdate[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [liveClasses, setLiveClasses] = useState<LiveClass[]>([]);
  const [scheduledClasses, setScheduledClasses] = useState<LiveClass[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasAcademyAccess, setHasAcademyAccess] = useState(false);

  useEffect(() => {
    loadData();
    
    // Subscribe to real-time updates
    const updatesChannel = supabase
      .channel('tutor-updates')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'tutor_updates'
      }, async (payload) => {
        loadUpdates();
        
        if (Notification.permission === 'granted' && hasAcademyAccess) {
          const update = payload.new as TutorUpdate;
          const course = courses.find(c => c.id === update.course_id);
          
          const registration = await navigator.serviceWorker?.ready;
          if (registration) {
            registration.showNotification('Lumina Academy', {
              body: `${course?.name || 'Course'}: ${update.title}`,
              icon: '/pwa-192x192.png',
              badge: '/pwa-192x192.png',
              tag: `tutor-update-${update.id}`,
              data: { url: '/academy' }
            });
          }
        }
        
        toast({
          title: "New Update",
          description: "Your tutor posted a new update!",
        });
      })
      .subscribe();

    // Subscribe to live class updates
    const classesChannel = supabase
      .channel('live-classes-academy')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'live_classes'
      }, () => {
        loadLiveClasses();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(updatesChannel);
      supabase.removeChannel(classesChannel);
    };
  }, [hasAcademyAccess, courses]);

  const loadData = async () => {
    setIsLoading(true);
    await Promise.all([
      loadEnrollments(),
      loadCourses(),
      loadUpdates(),
      loadLiveClasses()
    ]);
    setIsLoading(false);
  };

  const loadEnrollments = async () => {
    // DEV MODE: Bypass enrollment check - grant access to all users
    setHasAcademyAccess(true);
    
    const { data } = await supabase
      .from('academy_enrollments')
      .select('*')
      .eq('user_id', user?.id)
      .eq('status', 'active');

    if (data && data.length > 0) {
      setEnrollments(data);
    }
  };

  const loadLiveClasses = async () => {
    // Load live classes
    const { data: liveData } = await supabase
      .from('live_classes')
      .select('*, academy_courses(name)')
      .eq('status', 'live')
      .order('started_at', { ascending: false });

    setLiveClasses(liveData || []);

    // Load scheduled classes
    const { data: scheduledData } = await supabase
      .from('live_classes')
      .select('*, academy_courses(name)')
      .eq('status', 'scheduled')
      .gte('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(10);

    setScheduledClasses(scheduledData || []);
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

        <Tabs defaultValue="classes" className="flex-1">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="classes" className="flex-1 gap-1">
              <Video className="w-3.5 h-3.5" />
              Classes
              {liveClasses.length > 0 && (
                <span className="ml-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              )}
            </TabsTrigger>
            <TabsTrigger value="updates" className="flex-1">Updates</TabsTrigger>
            <TabsTrigger value="courses" className="flex-1">Courses</TabsTrigger>
          </TabsList>

          {/* Live Classes Tab */}
          <TabsContent value="classes" className="space-y-4">
            {/* Live Now Section */}
            {liveClasses.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  Live Now
                </h3>
                {liveClasses.map((liveClass) => (
                  <div
                    key={liveClass.id}
                    className="bg-gradient-to-r from-red-500/10 to-orange-500/10 rounded-2xl p-4 border border-red-500/20"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <h4 className="font-semibold text-foreground">{liveClass.title}</h4>
                        {liveClass.academy_courses && (
                          <Badge variant="secondary" className="mt-1 text-xs">
                            {liveClass.academy_courses.name}
                          </Badge>
                        )}
                        {liveClass.description && (
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                            {liveClass.description}
                          </p>
                        )}
                        {liveClass.started_at && (
                          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Started {formatDistanceToNow(new Date(liveClass.started_at), { addSuffix: true })}
                          </p>
                        )}
                      </div>
                      <Button
                        onClick={() => navigate(`/class/${liveClass.id}`)}
                        size="sm"
                        className="bg-red-500 hover:bg-red-600 shrink-0"
                      >
                        <Play className="w-4 h-4 mr-1" />
                        Join
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Scheduled Classes Section */}
            {scheduledClasses.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  Upcoming Classes
                </h3>
                {scheduledClasses.map((scheduledClass) => (
                  <div
                    key={scheduledClass.id}
                    className="bg-card rounded-2xl p-4 border border-border/50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <h4 className="font-semibold text-foreground">{scheduledClass.title}</h4>
                        {scheduledClass.academy_courses && (
                          <Badge variant="secondary" className="mt-1 text-xs">
                            {scheduledClass.academy_courses.name}
                          </Badge>
                        )}
                        {scheduledClass.description && (
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                            {scheduledClass.description}
                          </p>
                        )}
                        {scheduledClass.scheduled_at && (
                          <div className="flex items-center gap-2 mt-3 text-sm">
                            <Calendar className="w-4 h-4 text-primary" />
                            <span className="text-foreground">
                              {format(new Date(scheduledClass.scheduled_at), "PPP 'at' p")}
                            </span>
                          </div>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/class/${scheduledClass.id}`)}
                        className="shrink-0"
                      >
                        View
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Empty State */}
            {liveClasses.length === 0 && scheduledClasses.length === 0 && (
              <div className="text-center py-12">
                <Video className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground font-medium">No classes scheduled</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Live and scheduled classes will appear here
                </p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => navigate('/recordings')}
                >
                  View Past Recordings
                </Button>
              </div>
            )}
          </TabsContent>

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
