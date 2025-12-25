import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { 
  Users, BookOpen, Video, FileText, Clock, 
  TrendingUp, ChevronRight, GraduationCap, Calendar
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TutorData {
  userId: string;
  fullName: string;
  email: string;
  subjects: string[];
  enrolledStudents: number;
  totalClasses: number;
  upcomingClasses: number;
  completedClasses: number;
  updatesPosted: number;
  materialsUploaded: number;
  avgAttendance: number;
}

interface TutorClass {
  id: string;
  title: string;
  status: string;
  scheduled_at: string | null;
  started_at: string | null;
  ended_at: string | null;
  participantCount: number;
}

const TutorPerformance: React.FC = () => {
  const { toast } = useToast();
  const [tutors, setTutors] = useState<TutorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTutor, setSelectedTutor] = useState<TutorData | null>(null);
  const [tutorClasses, setTutorClasses] = useState<TutorClass[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);

  useEffect(() => {
    loadTutors();
  }, []);

  const loadTutors = async () => {
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

      const tutorIds = tutorRoles.map(r => r.user_id);

      // Get profiles for tutors
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, subjects')
        .in('user_id', tutorIds);

      if (profilesError) throw profilesError;

      // Get stats for each tutor
      const tutorDataPromises = tutorIds.map(async (tutorId) => {
        const profile = profiles?.find(p => p.user_id === tutorId);
        
        // Get tutor's courses by looking at live_classes they host
        const { data: classes } = await supabase
          .from('live_classes')
          .select('id, course_id, status')
          .eq('host_id', tutorId);

        const courseIds = [...new Set(classes?.map(c => c.course_id).filter(Boolean) || [])];
        
        // Get enrolled students count for tutor's courses
        let enrolledStudents = 0;
        if (courseIds.length > 0) {
          const { count } = await supabase
            .from('academy_enrollments')
            .select('id', { count: 'exact', head: true })
            .in('course_id', courseIds)
            .eq('status', 'active');
          enrolledStudents = count || 0;
        }

        // Get class counts
        const { count: totalClasses } = await supabase
          .from('live_classes')
          .select('id', { count: 'exact', head: true })
          .eq('host_id', tutorId);

        const { count: upcomingClasses } = await supabase
          .from('live_classes')
          .select('id', { count: 'exact', head: true })
          .eq('host_id', tutorId)
          .in('status', ['scheduled', 'live']);

        const { count: completedClasses } = await supabase
          .from('live_classes')
          .select('id', { count: 'exact', head: true })
          .eq('host_id', tutorId)
          .eq('status', 'ended');

        // Get updates count
        const { count: updatesPosted } = await supabase
          .from('tutor_updates')
          .select('id', { count: 'exact', head: true })
          .eq('tutor_id', tutorId);

        // Get materials count
        const { count: materialsUploaded } = await supabase
          .from('library_content')
          .select('id', { count: 'exact', head: true })
          .eq('created_by', tutorId);

        // Get attendance data
        let avgAttendance = 0;
        if (classes && classes.length > 0) {
          const classIds = classes.map(c => c.id);
          const { data: participants } = await supabase
            .from('class_participants')
            .select('class_id')
            .in('class_id', classIds);

          if (participants && completedClasses && completedClasses > 0) {
            avgAttendance = Math.round(participants.length / completedClasses);
          }
        }

        // Get email from auth
        const { data: userData } = await supabase.auth.admin.getUserById(tutorId);

        return {
          userId: tutorId,
          fullName: profile?.full_name || 'Unknown Tutor',
          email: userData?.user?.email || 'N/A',
          subjects: profile?.subjects || [],
          enrolledStudents,
          totalClasses: totalClasses || 0,
          upcomingClasses: upcomingClasses || 0,
          completedClasses: completedClasses || 0,
          updatesPosted: updatesPosted || 0,
          materialsUploaded: materialsUploaded || 0,
          avgAttendance
        };
      });

      const tutorData = await Promise.all(tutorDataPromises);
      setTutors(tutorData);
    } catch (error) {
      console.error('Error loading tutors:', error);
      toast({
        title: 'Error',
        description: 'Failed to load tutor data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadTutorDetails = async (tutor: TutorData) => {
    setSelectedTutor(tutor);
    setDetailsLoading(true);
    
    try {
      const { data: classes, error } = await supabase
        .from('live_classes')
        .select('id, title, status, scheduled_at, started_at, ended_at')
        .eq('host_id', tutor.userId)
        .order('scheduled_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      // Get participant counts
      const classesWithCounts = await Promise.all(
        (classes || []).map(async (cls) => {
          const { count } = await supabase
            .from('class_participants')
            .select('id', { count: 'exact', head: true })
            .eq('class_id', cls.id);

          return { ...cls, participantCount: count || 0 };
        })
      );

      setTutorClasses(classesWithCounts);
    } catch (error) {
      console.error('Error loading tutor details:', error);
    } finally {
      setDetailsLoading(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-ZM', {
      dateStyle: 'medium',
      timeZone: 'Africa/Lusaka'
    });
  };

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleTimeString('en-ZM', {
      timeStyle: 'short',
      timeZone: 'Africa/Lusaka'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'live':
        return <Badge className="bg-red-500">LIVE</Badge>;
      case 'scheduled':
        return <Badge variant="secondary">Scheduled</Badge>;
      case 'ended':
        return <Badge variant="outline">Ended</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Tutor Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
            </div>
          ) : tutors.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No tutors found
            </p>
          ) : (
            <div className="space-y-3">
              {tutors.map((tutor) => (
                <div 
                  key={tutor.userId}
                  className="p-4 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors cursor-pointer"
                  onClick={() => loadTutorDetails(tutor)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold">{tutor.fullName}</p>
                        {tutor.upcomingClasses > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {tutor.upcomingClasses} upcoming
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{tutor.email}</p>
                      
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-background/50 rounded p-2">
                          <p className="text-lg font-bold text-primary">{tutor.enrolledStudents}</p>
                          <p className="text-xs text-muted-foreground">Students</p>
                        </div>
                        <div className="bg-background/50 rounded p-2">
                          <p className="text-lg font-bold text-emerald-500">{tutor.completedClasses}</p>
                          <p className="text-xs text-muted-foreground">Classes</p>
                        </div>
                        <div className="bg-background/50 rounded p-2">
                          <p className="text-lg font-bold text-blue-500">{tutor.updatesPosted}</p>
                          <p className="text-xs text-muted-foreground">Updates</p>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground mt-2" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tutor Details Dialog */}
      <Dialog open={!!selectedTutor} onOpenChange={() => setSelectedTutor(null)}>
        <DialogContent className="max-w-lg max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5" />
              {selectedTutor?.fullName}
            </DialogTitle>
          </DialogHeader>
          
          {selectedTutor && (
            <ScrollArea className="h-[60vh]">
              <div className="space-y-4 pr-4">
                {/* Stats Summary */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-muted rounded-lg text-center">
                    <Users className="w-5 h-5 mx-auto mb-1 text-primary" />
                    <p className="text-xl font-bold">{selectedTutor.enrolledStudents}</p>
                    <p className="text-xs text-muted-foreground">Students</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg text-center">
                    <Video className="w-5 h-5 mx-auto mb-1 text-emerald-500" />
                    <p className="text-xl font-bold">{selectedTutor.totalClasses}</p>
                    <p className="text-xs text-muted-foreground">Total Classes</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg text-center">
                    <FileText className="w-5 h-5 mx-auto mb-1 text-blue-500" />
                    <p className="text-xl font-bold">{selectedTutor.updatesPosted}</p>
                    <p className="text-xs text-muted-foreground">Updates</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg text-center">
                    <BookOpen className="w-5 h-5 mx-auto mb-1 text-purple-500" />
                    <p className="text-xl font-bold">{selectedTutor.materialsUploaded}</p>
                    <p className="text-xs text-muted-foreground">Materials</p>
                  </div>
                </div>

                {/* Recent Classes */}
                <div>
                  <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Recent Classes
                  </h3>
                  
                  {detailsLoading ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}
                    </div>
                  ) : tutorClasses.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No classes yet
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {tutorClasses.map((cls) => (
                        <div key={cls.id} className="p-3 bg-muted/50 rounded-lg">
                          <div className="flex items-start justify-between mb-1">
                            <p className="font-medium text-sm">{cls.title}</p>
                            {getStatusBadge(cls.status)}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDate(cls.scheduled_at || cls.started_at)}
                              {' '}
                              {formatTime(cls.scheduled_at || cls.started_at)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {cls.participantCount} attended
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TutorPerformance;
