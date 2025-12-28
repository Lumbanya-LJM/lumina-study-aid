import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Users, Bell, Video, CheckCircle2, TrendingUp, FileText, Calendar, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

interface StatsDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  statType: 'students' | 'updates' | 'upcoming' | 'completed' | 'attendance' | 'materials' | null;
}

interface Student {
  id: string;
  full_name: string | null;
  university: string | null;
  enrolled_at: string;
  course_name: string;
}

interface Update {
  id: string;
  title: string;
  content: string;
  created_at: string;
  course_name: string;
}

interface ClassItem {
  id: string;
  title: string;
  scheduled_at: string | null;
  ended_at: string | null;
  status: string;
  course_name: string;
  participant_count?: number;
}

interface Material {
  id: string;
  title: string;
  file_name: string;
  file_type: string | null;
  created_at: string;
}

export const StatsDetailModal: React.FC<StatsDetailModalProps> = ({
  open,
  onOpenChange,
  statType,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [updates, setUpdates] = useState<Update[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);

  const handleDeleteUpdate = async (updateId: string) => {
    if (!confirm('Are you sure you want to delete this update?')) return;

    try {
      const { error } = await supabase
        .from('tutor_updates')
        .delete()
        .eq('id', updateId);

      if (error) throw error;

      setUpdates(prev => prev.filter(u => u.id !== updateId));
      toast({
        title: 'Deleted',
        description: 'Update deleted successfully.',
      });
    } catch (error) {
      console.error('Error deleting update:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete update.',
      });
    }
  };

  useEffect(() => {
    if (open && statType && user) {
      loadData();
    }
  }, [open, statType, user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);

    try {
      switch (statType) {
        case 'students':
          await loadStudents();
          break;
        case 'updates':
          await loadUpdates();
          break;
        case 'upcoming':
          await loadUpcomingClasses();
          break;
        case 'completed':
          await loadCompletedClasses();
          break;
        case 'attendance':
          await loadAttendanceData();
          break;
        case 'materials':
          await loadMaterials();
          break;
      }
    } catch (error) {
      console.error('Error loading stat details:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStudents = async () => {
    const { data: enrollments } = await supabase
      .from('academy_enrollments')
      .select(`
        id,
        enrolled_at,
        course_id,
        user_id,
        academy_courses (name)
      `)
      .eq('status', 'active')
      .order('enrolled_at', { ascending: false })
      .limit(50);

    if (enrollments) {
      const userIds = enrollments.map(e => e.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, university')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      const studentList: Student[] = enrollments.map(e => ({
        id: e.id,
        full_name: profileMap.get(e.user_id)?.full_name || 'Unknown',
        university: profileMap.get(e.user_id)?.university || null,
        enrolled_at: e.enrolled_at,
        course_name: (e.academy_courses as any)?.name || 'Unknown Course',
      }));

      setStudents(studentList);
    }
  };

  const loadUpdates = async () => {
    const { data } = await supabase
      .from('tutor_updates')
      .select(`
        id,
        title,
        content,
        created_at,
        academy_courses (name)
      `)
      .eq('tutor_id', user!.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (data) {
      setUpdates(data.map(u => ({
        id: u.id,
        title: u.title,
        content: u.content,
        created_at: u.created_at,
        course_name: (u.academy_courses as any)?.name || 'Unknown Course',
      })));
    }
  };

  const loadUpcomingClasses = async () => {
    const { data } = await supabase
      .from('live_classes')
      .select(`
        id,
        title,
        scheduled_at,
        status,
        academy_courses (name)
      `)
      .eq('host_id', user!.id)
      .in('status', ['scheduled', 'live'])
      .gte('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(20);

    if (data) {
      setClasses(data.map(c => ({
        id: c.id,
        title: c.title,
        scheduled_at: c.scheduled_at,
        ended_at: null,
        status: c.status,
        course_name: (c.academy_courses as any)?.name || 'Unknown Course',
      })));
    }
  };

  const loadCompletedClasses = async () => {
    const { data } = await supabase
      .from('live_classes')
      .select(`
        id,
        title,
        scheduled_at,
        ended_at,
        status,
        academy_courses (name)
      `)
      .eq('host_id', user!.id)
      .eq('status', 'ended')
      .order('ended_at', { ascending: false })
      .limit(20);

    if (data) {
      // Get participant counts
      const classIds = data.map(c => c.id);
      const { data: participants } = await supabase
        .from('class_participants')
        .select('class_id')
        .in('class_id', classIds);

      const countMap = new Map<string, number>();
      participants?.forEach(p => {
        countMap.set(p.class_id, (countMap.get(p.class_id) || 0) + 1);
      });

      setClasses(data.map(c => ({
        id: c.id,
        title: c.title,
        scheduled_at: c.scheduled_at,
        ended_at: c.ended_at,
        status: c.status,
        course_name: (c.academy_courses as any)?.name || 'Unknown Course',
        participant_count: countMap.get(c.id) || 0,
      })));
    }
  };

  const loadAttendanceData = async () => {
    // Same as completed but with attendance focus
    await loadCompletedClasses();
  };

  const loadMaterials = async () => {
    const { data } = await supabase
      .from('library_content')
      .select('id, title, created_at, content_type')
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(20);

    if (data) {
      setMaterials(data.map(m => ({
        id: m.id,
        title: m.title,
        file_name: m.title,
        file_type: m.content_type,
        created_at: m.created_at,
      })));
    }
  };

  const getTitle = () => {
    switch (statType) {
      case 'students': return 'Enrolled Students';
      case 'updates': return 'Your Updates';
      case 'upcoming': return 'Upcoming Classes';
      case 'completed': return 'Completed Classes';
      case 'attendance': return 'Attendance Records';
      case 'materials': return 'Course Materials';
      default: return 'Details';
    }
  };

  const getIcon = () => {
    switch (statType) {
      case 'students': return <Users className="w-5 h-5" />;
      case 'updates': return <Bell className="w-5 h-5" />;
      case 'upcoming': return <Video className="w-5 h-5" />;
      case 'completed': return <CheckCircle2 className="w-5 h-5" />;
      case 'attendance': return <TrendingUp className="w-5 h-5" />;
      case 'materials': return <FileText className="w-5 h-5" />;
      default: return null;
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      );
    }

    switch (statType) {
      case 'students':
        return students.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No students enrolled yet</div>
        ) : (
          <div className="space-y-3">
            {students.map(student => (
              <div key={student.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-primary font-semibold">
                      {student.full_name?.charAt(0) || '?'}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-sm">{student.full_name}</p>
                    <p className="text-xs text-muted-foreground">{student.course_name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">{student.university}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(student.enrolled_at), 'MMM d, yyyy')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        );

      case 'updates':
        return updates.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No updates posted yet</div>
        ) : (
          <div className="space-y-3">
            {updates.map(update => (
              <div key={update.id} className="p-3 bg-muted/50 rounded-lg group">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{update.title}</p>
                    <p className="text-xs text-primary">{update.course_name}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(update.created_at), 'MMM d, yyyy')}
                    </p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive hover:bg-destructive/10 transition-opacity"
                      onClick={() => handleDeleteUpdate(update.id)}
                      title="Delete update"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{update.content}</p>
              </div>
            ))}
          </div>
        );

      case 'upcoming':
      case 'completed':
      case 'attendance':
        return classes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {statType === 'upcoming' ? 'No upcoming classes' : 'No completed classes'}
          </div>
        ) : (
          <div className="space-y-3">
            {classes.map(cls => (
              <div key={cls.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Video className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{cls.title}</p>
                    <p className="text-xs text-muted-foreground">{cls.course_name}</p>
                  </div>
                </div>
                <div className="text-right">
                  {cls.status === 'live' && (
                    <Badge variant="destructive" className="animate-pulse mb-1">LIVE</Badge>
                  )}
                  {cls.participant_count !== undefined && (
                    <p className="text-xs font-medium text-primary">{cls.participant_count} attended</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {cls.scheduled_at && format(new Date(cls.scheduled_at), 'MMM d, h:mm a')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        );

      case 'materials':
        return materials.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No materials uploaded yet</div>
        ) : (
          <div className="space-y-3">
            {materials.map(material => (
              <div key={material.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{material.title}</p>
                    <p className="text-xs text-muted-foreground capitalize">{material.file_type}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(material.created_at), 'MMM d, yyyy')}
                </p>
              </div>
            ))}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getIcon()}
            {getTitle()}
          </DialogTitle>
          <DialogDescription>
            Detailed view of your {statType?.replace('_', ' ')} statistics
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          {renderContent()}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
