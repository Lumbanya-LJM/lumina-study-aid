import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  Users,
  BookOpen,
  Calendar,
  Clock,
  FileText,
  TrendingUp,
  Video,
  MessageSquare,
  ChevronRight,
  Activity,
  BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TutorStats {
  id: string;
  userId: string;
  name: string;
  email: string;
  subjects: string[];
  enrolledStudents: number;
  classesHeld: number;
  upcomingClasses: number;
  updatesPosted: number;
  materialsUploaded: number;
  avgAttendance: number;
  lastActive: string | null;
}

interface TutorClass {
  id: string;
  title: string;
  status: string;
  scheduledAt: string | null;
  participantCount: number;
}

const TutorActivityDashboard: React.FC = () => {
  const [tutors, setTutors] = useState<TutorStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTutor, setSelectedTutor] = useState<TutorStats | null>(null);
  const [tutorClasses, setTutorClasses] = useState<TutorClass[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);

  useEffect(() => {
    loadTutorActivity();
  }, []);

  const loadTutorActivity = async () => {
    setLoading(true);
    try {
      // Get all users with moderator role (tutors)
      const { data: tutorRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'moderator');

      if (rolesError) throw rolesError;

      if (!tutorRoles || tutorRoles.length === 0) {
        setTutors([]);
        setLoading(false);
        return;
      }

      const tutorUserIds = tutorRoles.map(r => r.user_id);

      // Get profiles for tutors
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, subjects')
        .in('user_id', tutorUserIds);

      if (profilesError) throw profilesError;

      // Get tutor applications for email
      const { data: applications, error: appsError } = await supabase
        .from('tutor_applications')
        .select('user_id, email')
        .in('user_id', tutorUserIds)
        .eq('status', 'approved');

      if (appsError) throw appsError;

      // Build tutor stats
      const tutorStats: TutorStats[] = await Promise.all(
        tutorUserIds.map(async (userId) => {
          const profile = profiles?.find(p => p.user_id === userId);
          const application = applications?.find(a => a.user_id === userId);

          // Get classes stats
          const { data: classes } = await supabase
            .from('live_classes')
            .select('id, status, scheduled_at')
            .eq('host_id', userId);

          const classesHeld = classes?.filter(c => c.status === 'ended').length || 0;
          const upcomingClasses = classes?.filter(c => c.status === 'scheduled').length || 0;

          // Get participant counts for attendance
          let totalParticipants = 0;
          if (classes && classes.length > 0) {
            const { count } = await supabase
              .from('class_participants')
              .select('id', { count: 'exact', head: true })
              .in('class_id', classes.map(c => c.id));
            totalParticipants = count || 0;
          }

          // Get updates count
          const { count: updatesCount } = await supabase
            .from('tutor_updates')
            .select('id', { count: 'exact', head: true })
            .eq('tutor_id', userId);

          // Get materials count
          const { count: materialsCount } = await supabase
            .from('course_materials')
            .select('id', { count: 'exact', head: true })
            .eq('uploaded_by', userId);

          // Get enrolled students (unique students in courses this tutor teaches)
          const { data: tutorUpdates } = await supabase
            .from('tutor_updates')
            .select('course_id')
            .eq('tutor_id', userId);

          let enrolledStudents = 0;
          if (tutorUpdates && tutorUpdates.length > 0) {
            const courseIds = [...new Set(tutorUpdates.map(u => u.course_id))];
            const { count } = await supabase
              .from('academy_enrollments')
              .select('id', { count: 'exact', head: true })
              .in('course_id', courseIds)
              .eq('status', 'active');
            enrolledStudents = count || 0;
          }

          const avgAttendance = classesHeld > 0 ? Math.round(totalParticipants / classesHeld) : 0;

          // Get last activity
          const lastClass = classes?.sort((a, b) => 
            new Date(b.scheduled_at || 0).getTime() - new Date(a.scheduled_at || 0).getTime()
          )[0];

          return {
            id: userId,
            userId,
            name: profile?.full_name || 'Unknown Tutor',
            email: application?.email || '',
            subjects: profile?.subjects || [],
            enrolledStudents,
            classesHeld,
            upcomingClasses,
            updatesPosted: updatesCount || 0,
            materialsUploaded: materialsCount || 0,
            avgAttendance,
            lastActive: lastClass?.scheduled_at || null,
          };
        })
      );

      // Sort by activity (classes held + updates)
      tutorStats.sort((a, b) => (b.classesHeld + b.updatesPosted) - (a.classesHeld + a.updatesPosted));
      setTutors(tutorStats);
    } catch (error) {
      console.error('Error loading tutor activity:', error);
      toast.error('Failed to load tutor activity');
    } finally {
      setLoading(false);
    }
  };

  const loadTutorDetails = async (tutor: TutorStats) => {
    setSelectedTutor(tutor);
    setDetailsLoading(true);
    try {
      const { data: classes, error } = await supabase
        .from('live_classes')
        .select('id, title, status, scheduled_at')
        .eq('host_id', tutor.userId)
        .order('scheduled_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      // Get participant counts
      const classesWithParticipants = await Promise.all(
        (classes || []).map(async (cls) => {
          const { count } = await supabase
            .from('class_participants')
            .select('id', { count: 'exact', head: true })
            .eq('class_id', cls.id);

          return {
            id: cls.id,
            title: cls.title,
            status: cls.status,
            scheduledAt: cls.scheduled_at,
            participantCount: count || 0,
          };
        })
      );

      setTutorClasses(classesWithParticipants);
    } catch (error) {
      console.error('Error loading tutor details:', error);
      toast.error('Failed to load tutor details');
    } finally {
      setDetailsLoading(false);
    }
  };

  const getActivityLevel = (tutor: TutorStats) => {
    const score = tutor.classesHeld * 3 + tutor.updatesPosted * 2 + tutor.materialsUploaded;
    if (score >= 20) return { label: 'High', color: 'bg-emerald-500' };
    if (score >= 10) return { label: 'Medium', color: 'bg-yellow-500' };
    return { label: 'Low', color: 'bg-red-500' };
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-ZM', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'live':
        return <Badge className="bg-red-500 text-white">LIVE</Badge>;
      case 'scheduled':
        return <Badge variant="secondary">Scheduled</Badge>;
      case 'ended':
        return <Badge variant="outline">Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{tutors.length}</p>
                <p className="text-xs text-muted-foreground">Active Tutors</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Video className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{tutors.reduce((sum, t) => sum + t.classesHeld, 0)}</p>
                <p className="text-xs text-muted-foreground">Classes Held</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{tutors.reduce((sum, t) => sum + t.updatesPosted, 0)}</p>
                <p className="text-xs text-muted-foreground">Updates Posted</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{tutors.reduce((sum, t) => sum + t.materialsUploaded, 0)}</p>
                <p className="text-xs text-muted-foreground">Materials</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tutor List */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="w-5 h-5" />
            Tutor Activity & Productivity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tutors.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No tutors found</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {tutors.map((tutor) => {
                  const activity = getActivityLevel(tutor);
                  return (
                    <div
                      key={tutor.id}
                      onClick={() => loadTutorDetails(tutor)}
                      className="flex items-center gap-4 p-4 rounded-lg border border-border/50 hover:border-primary/30 cursor-pointer transition-colors"
                    >
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="font-bold text-primary">
                          {tutor.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium truncate">{tutor.name}</p>
                          <div className={cn('w-2 h-2 rounded-full', activity.color)} />
                          <span className="text-xs text-muted-foreground">{activity.label}</span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{tutor.email}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Video className="w-3 h-3" />
                            {tutor.classesHeld} classes
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" />
                            {tutor.updatesPosted} updates
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {tutor.enrolledStudents} students
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Tutor Details Dialog */}
      <Dialog open={!!selectedTutor} onOpenChange={() => setSelectedTutor(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              {selectedTutor?.name} - Activity Details
            </DialogTitle>
          </DialogHeader>

          {selectedTutor && (
            <div className="space-y-4">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold">{selectedTutor.classesHeld}</p>
                  <p className="text-xs text-muted-foreground">Classes Held</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold">{selectedTutor.upcomingClasses}</p>
                  <p className="text-xs text-muted-foreground">Upcoming</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold">{selectedTutor.avgAttendance}</p>
                  <p className="text-xs text-muted-foreground">Avg Attendance</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold">{selectedTutor.enrolledStudents}</p>
                  <p className="text-xs text-muted-foreground">Students</p>
                </div>
              </div>

              {/* Subjects */}
              {selectedTutor.subjects.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Subjects</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedTutor.subjects.map((subject, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {subject}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Classes */}
              <div>
                <p className="text-sm font-medium mb-2">Recent Classes</p>
                {detailsLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}
                  </div>
                ) : tutorClasses.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No classes yet
                  </p>
                ) : (
                  <ScrollArea className="h-48">
                    <div className="space-y-2">
                      {tutorClasses.map((cls) => (
                        <div key={cls.id} className="p-3 border border-border/50 rounded-lg">
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-medium text-sm truncate">{cls.title}</p>
                            {getStatusBadge(cls.status)}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatDate(cls.scheduledAt)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {cls.participantCount} attended
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TutorActivityDashboard;
