import React, { useState, useEffect } from 'react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { 
  ArrowLeft, 
  GraduationCap, 
  Bell,
  Video,
  Calendar,
  CalendarDays,
  ExternalLink,
  BookOpen,
  Play,
  Clock,
  Loader2,
  Sparkles,
  FileText,
  FolderOpen,
  ChevronRight,
  Download,
  Plus,
  ShoppingCart,
  RefreshCw
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { AddCourseModal } from '@/components/academy/AddCourseModal';
import { WeeklyClassCalendar } from '@/components/academy/WeeklyClassCalendar';

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
}

interface LiveClass {
  id: string;
  title: string;
  description: string | null;
  status: string;
  scheduled_at: string | null;
  started_at: string | null;
  ended_at: string | null;
  daily_room_name: string | null;
  daily_room_url: string | null;
  course_id: string | null;
  host_id: string;
  recording_url: string | null;
}

interface CourseMaterial {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  file_url: string;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  created_at: string;
}

interface CourseTutor {
  user_id: string;
  full_name: string;
}

const LuminaAcademyPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddCourseModal, setShowAddCourseModal] = useState(false);
  const [isTutor, setIsTutor] = useState(false);
  
  // Course-specific data
  const [liveClasses, setLiveClasses] = useState<LiveClass[]>([]);
  const [scheduledClasses, setScheduledClasses] = useState<LiveClass[]>([]);
  const [recordings, setRecordings] = useState<LiveClass[]>([]);
  const [materials, setMaterials] = useState<CourseMaterial[]>([]);
  const [updates, setUpdates] = useState<TutorUpdate[]>([]);
  const [courseTutors, setCourseTutors] = useState<CourseTutor[]>([]);
  const [loadingCourseData, setLoadingCourseData] = useState(false);

  // Check if user is a tutor
  useEffect(() => {
    const checkTutorRole = async () => {
      if (!user?.id) return;
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .in('role', ['admin', 'moderator']);
      setIsTutor(data && data.length > 0);
    };
    checkTutorRole();
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      loadEnrolledCourses();
    }
  }, [user?.id]);

  useEffect(() => {
    if (selectedCourse) {
      loadCourseData(selectedCourse.id);
    }
  }, [selectedCourse]);

  // Real-time subscriptions for the selected course
  useEffect(() => {
    if (!selectedCourse) return;

    const classesChannel = supabase
      .channel(`course-classes-${selectedCourse.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'live_classes',
        filter: `course_id=eq.${selectedCourse.id}`
      }, () => {
        loadCourseData(selectedCourse.id);
      })
      .subscribe();

    const updatesChannel = supabase
      .channel(`course-updates-${selectedCourse.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'tutor_updates',
        filter: `course_id=eq.${selectedCourse.id}`
      }, (payload) => {
        const update = payload.new as TutorUpdate;
        setUpdates(prev => [update, ...prev]);
        toast({
          title: "New Update",
          description: "Your tutor posted a new update!",
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(classesChannel);
      supabase.removeChannel(updatesChannel);
    };
  }, [selectedCourse, toast]);

  const loadEnrolledCourses = async () => {
    if (!user?.id) return;
    setIsLoading(true);

    try {
      // Get enrollments
      const { data: enrollments, error: enrollError } = await supabase
        .from('academy_enrollments')
        .select('course_id')
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (enrollError) throw enrollError;

      if (enrollments && enrollments.length > 0) {
        const courseIds = enrollments.map(e => e.course_id);
        
        const { data: courses, error: coursesError } = await supabase
          .from('academy_courses')
          .select('*')
          .in('id', courseIds)
          .eq('is_active', true);

        if (coursesError) throw coursesError;

        setEnrolledCourses(courses || []);
        
        // Auto-select first course if available
        if (courses && courses.length > 0 && !selectedCourse) {
          setSelectedCourse(courses[0]);
        }
      }
    } catch (error) {
      console.error('Error loading enrolled courses:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load your courses',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadCourseData = async (courseId: string) => {
    setLoadingCourseData(true);

    try {
      // Load live classes
      const { data: liveData } = await supabase
        .from('live_classes')
        .select('*')
        .eq('course_id', courseId)
        .eq('status', 'live')
        .order('started_at', { ascending: false });

      setLiveClasses(liveData || []);

      // Load scheduled classes
      const { data: scheduledData } = await supabase
        .from('live_classes')
        .select('*')
        .eq('course_id', courseId)
        .eq('status', 'scheduled')
        .gte('scheduled_at', new Date().toISOString())
        .order('scheduled_at', { ascending: true });

      setScheduledClasses(scheduledData || []);

      // Load recordings (ended classes with recording_url)
      const { data: recordingsData } = await supabase
        .from('live_classes')
        .select('*')
        .eq('course_id', courseId)
        .eq('status', 'ended')
        .not('recording_url', 'is', null)
        .order('ended_at', { ascending: false });

      setRecordings(recordingsData || []);

      // Load course materials
      const { data: materialsData } = await supabase
        .from('course_materials')
        .select('*')
        .eq('course_id', courseId)
        .order('created_at', { ascending: false });

      setMaterials(materialsData || []);

      // Load updates
      const { data: updatesData } = await supabase
        .from('tutor_updates')
        .select('*')
        .eq('course_id', courseId)
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      setUpdates(updatesData || []);

      // Load tutors for this course (from live_classes hosts)
      const { data: classHosts } = await supabase
        .from('live_classes')
        .select('host_id')
        .eq('course_id', courseId);

      const uniqueHostIds = [...new Set(classHosts?.map(c => c.host_id) || [])];
      
      if (uniqueHostIds.length > 0) {
        const { data: tutorProfiles } = await supabase
          .from('tutor_applications')
          .select('user_id, full_name')
          .in('user_id', uniqueHostIds)
          .eq('status', 'approved');
        
        setCourseTutors(tutorProfiles || []);
      } else {
        setCourseTutors([]);
      }

    } catch (error) {
      console.error('Error loading course data:', error);
    } finally {
      setLoadingCourseData(false);
    }
  };

  const getUpdateIcon = (type: string) => {
    switch (type) {
      case 'class': return Video;
      case 'alert': return Bell;
      case 'schedule': return Calendar;
      default: return BookOpen;
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Course Selection View
  if (!selectedCourse) {
    return (
      <MobileLayout showNav={true}>
        <div className="flex flex-col min-h-screen py-6 safe-top">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-secondary transition-colors">
                <ArrowLeft className="w-5 h-5 text-foreground" />
              </button>
              <div>
                <h1 className="text-lg font-semibold text-foreground">Lumina Academy</h1>
                <p className="text-xs text-muted-foreground">Select a course to continue</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => navigate('/marketplace')}
                size="sm"
                variant="outline"
                className="gap-1"
              >
                <ShoppingCart className="w-4 h-4" />
                Buy Classes
              </Button>
              {isTutor && (
                <Button
                  onClick={() => navigate('/teach')}
                  size="sm"
                  variant="outline"
                  className="gap-1 border-primary/50 text-primary"
                >
                  <GraduationCap className="w-4 h-4" />
                  Teach
                </Button>
              )}
              <Button
                onClick={() => setShowAddCourseModal(true)}
                size="sm"
                className="gap-1"
              >
                <Plus className="w-4 h-4" />
                Add
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : enrolledCourses.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-6">
                <GraduationCap className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">No Enrolled Courses</h2>
              <p className="text-muted-foreground mb-6">
                You haven't enrolled in any courses yet. Tap the button above to add courses.
              </p>
              <Button onClick={() => setShowAddCourseModal(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Browse Available Courses
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-foreground">My Courses ({enrolledCourses.length})</h2>
              </div>
              {enrolledCourses.map((course) => (
                <button
                  key={course.id}
                  onClick={() => setSelectedCourse(course)}
                  className="w-full bg-card rounded-2xl p-4 border border-border/50 hover:border-primary/30 transition-all text-left group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                      <GraduationCap className="w-7 h-7 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground">{course.name}</h3>
                      <p className="text-xs text-muted-foreground">{course.institution}</p>
                      {course.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{course.description}</p>
                      )}
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </button>
              ))}
            </div>
          )}

          <AddCourseModal
            open={showAddCourseModal}
            onOpenChange={setShowAddCourseModal}
            enrolledCourseIds={enrolledCourses.map(c => c.id)}
            onEnrollmentSuccess={loadEnrolledCourses}
          />
        </div>
      </MobileLayout>
    );
  }

  // Course Detail View
  return (
    <MobileLayout showNav={true}>
      <div className="flex flex-col min-h-screen py-6 safe-top">
        {/* Header */}
        <div className="flex items-center gap-4 mb-4">
          <button 
            onClick={() => setSelectedCourse(null)} 
            className="p-2 rounded-xl hover:bg-secondary transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold text-foreground truncate">{selectedCourse.name}</h1>
            <p className="text-xs text-muted-foreground">{selectedCourse.institution}</p>
          </div>
        </div>

        {/* Course Tutors */}
        {courseTutors.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            <span className="text-xs text-muted-foreground">Tutors:</span>
            {courseTutors.map((tutor) => (
              <button
                key={tutor.user_id}
                onClick={() => navigate(`/tutor/${tutor.user_id}`)}
                className="text-xs text-primary hover:underline font-medium"
              >
                {tutor.full_name}
              </button>
            ))}
          </div>
        )}

        {/* Live Class Banner */}
        {liveClasses.length > 0 && (
          <div className="mb-4 bg-gradient-to-r from-red-500/10 to-orange-500/10 rounded-2xl p-4 border border-red-500/20">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-sm font-semibold text-red-500">LIVE NOW</span>
            </div>
            {liveClasses.map((liveClass) => (
              <div key={liveClass.id} className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-foreground">{liveClass.title}</h4>
                  {liveClass.started_at && (
                    <p className="text-xs text-muted-foreground">
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
            ))}
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="schedule" className="flex-1">
          <TabsList className="w-full mb-4 grid grid-cols-5">
            <TabsTrigger value="schedule" className="text-xs gap-1">
              <CalendarDays className="w-3.5 h-3.5" />
              Schedule
            </TabsTrigger>
            <TabsTrigger value="classes" className="text-xs gap-1">
              <Video className="w-3.5 h-3.5" />
              Classes
            </TabsTrigger>
            <TabsTrigger value="recordings" className="text-xs gap-1">
              <Play className="w-3.5 h-3.5" />
              Recordings
            </TabsTrigger>
            <TabsTrigger value="materials" className="text-xs gap-1">
              <FileText className="w-3.5 h-3.5" />
              Materials
            </TabsTrigger>
            <TabsTrigger value="updates" className="text-xs gap-1">
              <Bell className="w-3.5 h-3.5" />
              Updates
            </TabsTrigger>
          </TabsList>

          {loadingCourseData ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Schedule Tab - Weekly Calendar */}
              <TabsContent value="schedule" className="space-y-4">
                <WeeklyClassCalendar />
              </TabsContent>

              {/* Classes Tab */}
              <TabsContent value="classes" className="space-y-4">
                {scheduledClasses.length > 0 ? (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-primary" />
                      Upcoming Classes
                    </h3>
                    {scheduledClasses.map((scheduledClass: any) => (
                      <div
                        key={scheduledClass.id}
                        className="bg-card rounded-2xl p-4 border border-border/50"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-foreground">{scheduledClass.title}</h4>
                              {scheduledClass.is_recurring && (
                                <RefreshCw className="w-3 h-3 text-muted-foreground" />
                              )}
                            </div>
                            {scheduledClass.description && (
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {scheduledClass.description}
                              </p>
                            )}
                            {scheduledClass.scheduled_at && (
                              <div className="flex items-center gap-2 mt-3 text-sm">
                                <Clock className="w-4 h-4 text-primary" />
                                <span className="text-foreground">
                                  {format(new Date(scheduledClass.scheduled_at), "PPP 'at' p")}
                                </span>
                              </div>
                            )}
                            {scheduledClass.is_recurring && scheduledClass.recurrence_description && (
                              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-lg w-fit">
                                <RefreshCw className="w-3 h-3" />
                                <span>{scheduledClass.recurrence_description}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Calendar className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground font-medium">No upcoming classes</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Scheduled classes will appear here
                    </p>
                  </div>
                )}
              </TabsContent>

              {/* Recordings Tab */}
              <TabsContent value="recordings" className="space-y-4">
                {recordings.length > 0 ? (
                  <div className="space-y-3">
                    {recordings.map((recording) => (
                      <div
                        key={recording.id}
                        className="bg-card rounded-2xl p-4 border border-border/50"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                            <Video className="w-6 h-6 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-foreground">{recording.title}</h4>
                            {recording.ended_at && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Recorded {format(new Date(recording.ended_at), 'PPP')}
                              </p>
                            )}
                          </div>
                          {recording.recording_url && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(recording.recording_url!, '_blank')}
                            >
                              <Play className="w-4 h-4 mr-1" />
                              Watch
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Video className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground font-medium">No recordings yet</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Class recordings will appear here
                    </p>
                  </div>
                )}
              </TabsContent>

              {/* Materials Tab */}
              <TabsContent value="materials" className="space-y-4">
                {materials.length > 0 ? (
                  <div className="space-y-3">
                    {materials.map((material) => (
                      <div
                        key={material.id}
                        className="bg-card rounded-2xl p-4 border border-border/50"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                            <FileText className="w-6 h-6 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-foreground">{material.title}</h4>
                            {material.description && (
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                                {material.description}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                              <span>{material.file_type?.toUpperCase() || 'FILE'}</span>
                              {material.file_size && (
                                <>
                                  <span>•</span>
                                  <span>{formatFileSize(material.file_size)}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(material.file_url, '_blank')}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <FolderOpen className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground font-medium">No materials yet</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Course materials will appear here
                    </p>
                  </div>
                )}
              </TabsContent>

              {/* Updates Tab */}
              <TabsContent value="updates" className="space-y-4">
                {updates.length > 0 ? (
                  <div className="space-y-3">
                    {updates.map((update) => {
                      const Icon = getUpdateIcon(update.update_type);
                      
                      return (
                        <div key={update.id} className="bg-card rounded-2xl p-4 border border-border/50">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                              <Icon className="w-5 h-5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <h3 className="font-semibold text-foreground">{update.title}</h3>
                                <span className="text-[10px] text-muted-foreground shrink-0">
                                  {format(new Date(update.created_at), 'MMM d')}
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground mt-2">{update.content}</p>
                              
                              {update.class_time && (
                                <div className="flex items-center gap-2 mt-3 text-sm text-foreground">
                                  <Calendar className="w-4 h-4 text-muted-foreground" />
                                  {format(new Date(update.class_time), "PPP 'at' p")}
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
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Bell className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground font-medium">No updates yet</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Tutor updates will appear here
                    </p>
                  </div>
                )}
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </MobileLayout>
  );
};

export default LuminaAcademyPage;