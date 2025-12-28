import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Loader2, Users, BookOpen, GraduationCap, Clock, Activity, FileText } from 'lucide-react';
import { format } from 'date-fns';

export type AdminStatType = 'users' | 'courses' | 'enrollments' | 'applications' | 'classes' | 'library' | null;

interface AdminStatsDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  statType: AdminStatType;
}

interface User {
  id: string;
  full_name: string | null;
  university: string | null;
  created_at: string;
}

interface Course {
  id: string;
  name: string;
  institution: string | null;
  price: number;
  is_active: boolean;
  enrollment_count: number;
}

interface Enrollment {
  id: string;
  user_name: string | null;
  course_name: string;
  enrolled_at: string;
  status: string;
}

interface Application {
  id: string;
  full_name: string;
  email: string;
  status: string;
  created_at: string;
}

interface ClassItem {
  id: string;
  title: string;
  host_name: string | null;
  scheduled_at: string | null;
  status: string;
}

interface LibraryItem {
  id: string;
  title: string;
  content_type: string;
  subject: string;
  created_at: string;
}

export const AdminStatsDetailModal: React.FC<AdminStatsDetailModalProps> = ({
  open,
  onOpenChange,
  statType,
}) => {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([]);

  useEffect(() => {
    if (open && statType) {
      loadData();
    }
  }, [open, statType]);

  const loadData = async () => {
    setLoading(true);
    try {
      switch (statType) {
        case 'users':
          await loadUsers();
          break;
        case 'courses':
          await loadCourses();
          break;
        case 'enrollments':
          await loadEnrollments();
          break;
        case 'applications':
          await loadApplications();
          break;
        case 'classes':
          await loadClasses();
          break;
        case 'library':
          await loadLibrary();
          break;
      }
    } catch (error) {
      console.error('Error loading stat details:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, university, created_at')
      .order('created_at', { ascending: false })
      .limit(50);

    if (data) {
      setUsers(data);
    }
  };

  const loadCourses = async () => {
    const { data: coursesData } = await supabase
      .from('academy_courses')
      .select('id, name, institution, price, is_active')
      .order('created_at', { ascending: false });

    if (coursesData) {
      // Get enrollment counts
      const courseIds = coursesData.map(c => c.id);
      const { data: enrollmentCounts } = await supabase
        .from('academy_enrollments')
        .select('course_id')
        .in('course_id', courseIds)
        .eq('status', 'active');

      const countMap = new Map<string, number>();
      enrollmentCounts?.forEach(e => {
        countMap.set(e.course_id, (countMap.get(e.course_id) || 0) + 1);
      });

      setCourses(coursesData.map(c => ({
        ...c,
        enrollment_count: countMap.get(c.id) || 0,
      })));
    }
  };

  const loadEnrollments = async () => {
    const { data } = await supabase
      .from('academy_enrollments')
      .select(`
        id,
        enrolled_at,
        status,
        user_id,
        academy_courses (name)
      `)
      .order('enrolled_at', { ascending: false })
      .limit(50);

    if (data) {
      const userIds = data.map(e => e.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);

      setEnrollments(data.map(e => ({
        id: e.id,
        user_name: profileMap.get(e.user_id) || 'Unknown User',
        course_name: (e.academy_courses as any)?.name || 'Unknown Course',
        enrolled_at: e.enrolled_at,
        status: e.status || 'active',
      })));
    }
  };

  const loadApplications = async () => {
    const { data } = await supabase
      .from('tutor_applications')
      .select('id, full_name, email, status, created_at')
      .order('created_at', { ascending: false })
      .limit(50);

    if (data) {
      setApplications(data);
    }
  };

  const loadClasses = async () => {
    const { data } = await supabase
      .from('live_classes')
      .select('id, title, host_id, scheduled_at, status')
      .in('status', ['scheduled', 'live'])
      .order('scheduled_at', { ascending: true })
      .limit(50);

    if (data) {
      const hostIds = [...new Set(data.map(c => c.host_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', hostIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);

      setClasses(data.map(c => ({
        id: c.id,
        title: c.title,
        host_name: profileMap.get(c.host_id) || 'Unknown Tutor',
        scheduled_at: c.scheduled_at,
        status: c.status,
      })));
    }
  };

  const loadLibrary = async () => {
    const { data } = await supabase
      .from('library_content')
      .select('id, title, content_type, subject, created_at')
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(50);

    if (data) {
      setLibraryItems(data);
    }
  };

  const getTitle = () => {
    switch (statType) {
      case 'users': return 'All Users';
      case 'courses': return 'Active Courses';
      case 'enrollments': return 'Course Enrollments';
      case 'applications': return 'Tutor Applications';
      case 'classes': return 'Active Classes';
      case 'library': return 'Library Content';
      default: return 'Details';
    }
  };

  const getIcon = () => {
    switch (statType) {
      case 'users': return <Users className="w-5 h-5" />;
      case 'courses': return <BookOpen className="w-5 h-5" />;
      case 'enrollments': return <GraduationCap className="w-5 h-5" />;
      case 'applications': return <Clock className="w-5 h-5" />;
      case 'classes': return <Activity className="w-5 h-5" />;
      case 'library': return <FileText className="w-5 h-5" />;
      default: return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-orange-500/10 text-orange-500">Pending</Badge>;
      case 'approved':
        return <Badge variant="secondary" className="bg-green-500/10 text-green-500">Approved</Badge>;
      case 'rejected':
        return <Badge variant="secondary" className="bg-red-500/10 text-red-500">Rejected</Badge>;
      case 'live':
        return <Badge variant="destructive" className="animate-pulse">LIVE</Badge>;
      case 'scheduled':
        return <Badge variant="secondary">Scheduled</Badge>;
      case 'active':
        return <Badge variant="secondary" className="bg-green-500/10 text-green-500">Active</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
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
      case 'users':
        return users.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No users found</div>
        ) : (
          <div className="space-y-3">
            {users.map(user => (
              <div key={user.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-primary font-semibold">
                      {user.full_name?.charAt(0) || '?'}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-sm">{user.full_name || 'Unnamed User'}</p>
                    <p className="text-xs text-muted-foreground">{user.university || 'No university'}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(user.created_at), 'MMM d, yyyy')}
                </p>
              </div>
            ))}
          </div>
        );

      case 'courses':
        return courses.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No courses found</div>
        ) : (
          <div className="space-y-3">
            {courses.map(course => (
              <div key={course.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{course.name}</p>
                    <p className="text-xs text-muted-foreground">{course.institution}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-primary">{course.enrollment_count} students</p>
                  <p className="text-xs text-muted-foreground">K{course.price}</p>
                </div>
              </div>
            ))}
          </div>
        );

      case 'enrollments':
        return enrollments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No enrollments found</div>
        ) : (
          <div className="space-y-3">
            {enrollments.map(enrollment => (
              <div key={enrollment.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                    <span className="text-purple-500 font-semibold">
                      {enrollment.user_name?.charAt(0) || '?'}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-sm">{enrollment.user_name}</p>
                    <p className="text-xs text-muted-foreground">{enrollment.course_name}</p>
                  </div>
                </div>
                <div className="text-right">
                  {getStatusBadge(enrollment.status)}
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(enrollment.enrolled_at), 'MMM d, yyyy')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        );

      case 'applications':
        return applications.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No applications found</div>
        ) : (
          <div className="space-y-3">
            {applications.map(app => (
              <div key={app.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                    <span className="text-orange-500 font-semibold">
                      {app.full_name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-sm">{app.full_name}</p>
                    <p className="text-xs text-muted-foreground">{app.email}</p>
                  </div>
                </div>
                <div className="text-right">
                  {getStatusBadge(app.status)}
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(app.created_at), 'MMM d, yyyy')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        );

      case 'classes':
        return classes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No active classes</div>
        ) : (
          <div className="space-y-3">
            {classes.map(cls => (
              <div key={cls.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-pink-500/10 flex items-center justify-center">
                    <Activity className="w-5 h-5 text-pink-500" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{cls.title}</p>
                    <p className="text-xs text-muted-foreground">by {cls.host_name}</p>
                  </div>
                </div>
                <div className="text-right">
                  {getStatusBadge(cls.status)}
                  {cls.scheduled_at && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(cls.scheduled_at), 'MMM d, h:mm a')}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        );

      case 'library':
        return libraryItems.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No library content</div>
        ) : (
          <div className="space-y-3">
            {libraryItems.map(item => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-cyan-500" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{item.title}</p>
                    <p className="text-xs text-muted-foreground capitalize">{item.content_type} · {item.subject}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(item.created_at), 'MMM d, yyyy')}
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
            Detailed view of {statType?.replace('_', ' ')} data
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          {renderContent()}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
