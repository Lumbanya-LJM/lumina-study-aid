import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ArrowLeft, 
  BookOpen, 
  Users, 
  Video, 
  Award, 
  Briefcase,
  Mail,
  Calendar
} from 'lucide-react';

interface TutorProfile {
  user_id: string;
  full_name: string;
  email: string;
  qualifications: string | null;
  experience: string | null;
  subjects: string[] | null;
  avatar_url?: string | null;
  created_at: string;
}

interface Course {
  id: string;
  name: string;
  description: string | null;
  price: number;
  enrollmentCount: number;
}

const TutorProfilePage: React.FC = () => {
  const { tutorId } = useParams<{ tutorId: string }>();
  const navigate = useNavigate();
  const [tutor, setTutor] = useState<TutorProfile | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [liveClassCount, setLiveClassCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (tutorId) {
      loadTutorProfile();
    }
  }, [tutorId]);

  const loadTutorProfile = async () => {
    try {
      // Get tutor application (approved tutors)
      const { data: application, error: appError } = await supabase
        .from('tutor_applications')
        .select('*')
        .eq('user_id', tutorId)
        .eq('status', 'approved')
        .single();

      if (appError) throw appError;

      // Get tutor's profile for avatar
      const { data: profile } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('user_id', tutorId)
        .single();

      setTutor({
        ...application,
        avatar_url: profile?.avatar_url
      });

      // Get courses taught by this tutor (via live_classes host_id)
      const { data: liveClasses } = await supabase
        .from('live_classes')
        .select('course_id')
        .eq('host_id', tutorId);

      const courseIds = [...new Set(liveClasses?.map(lc => lc.course_id).filter(Boolean) || [])];
      
      if (courseIds.length > 0) {
        const { data: coursesData } = await supabase
          .from('academy_courses')
          .select('*')
          .in('id', courseIds)
          .eq('is_active', true);

        if (coursesData) {
          // Get enrollment counts for each course
          const coursesWithEnrollments = await Promise.all(
            coursesData.map(async (course) => {
              const { count } = await supabase
                .from('academy_enrollments')
                .select('*', { count: 'exact', head: true })
                .eq('course_id', course.id)
                .eq('status', 'active');

              return {
                ...course,
                enrollmentCount: count || 0
              };
            })
          );
          setCourses(coursesWithEnrollments);
        }
      }

      // Get live class count
      const { count } = await supabase
        .from('live_classes')
        .select('*', { count: 'exact', head: true })
        .eq('host_id', tutorId);

      setLiveClassCount(count || 0);
    } catch (error) {
      console.error('Error loading tutor profile:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="flex items-center gap-3 p-4 border-b border-border">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <Skeleton className="h-6 w-32" />
        </div>
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-4">
            <Skeleton className="w-20 h-20 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  if (!tutor) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="flex items-center gap-3 p-4 border-b border-border">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-semibold">Tutor Not Found</h1>
        </div>
        <div className="flex flex-col items-center justify-center h-64 px-6 text-center">
          <Users className="w-12 h-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">This tutor profile doesn't exist or is not available.</p>
          <Button variant="link" onClick={() => navigate('/academy')}>
            Browse Academy
          </Button>
        </div>
      </div>
    );
  }

  const initials = tutor.full_name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const totalStudents = courses.reduce((acc, course) => acc + course.enrollmentCount, 0);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="font-semibold">Tutor Profile</h1>
      </div>

      <div className="p-4 space-y-6">
        {/* Profile Header */}
        <div className="flex items-start gap-4">
          <Avatar className="w-20 h-20 border-2 border-primary">
            <AvatarImage src={tutor.avatar_url || undefined} alt={tutor.full_name} />
            <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-foreground">{tutor.full_name}</h2>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Award className="w-3 h-3" />
              Verified Tutor
            </p>
            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
              <Calendar className="w-3 h-3" />
              Joined {new Date(tutor.created_at).toLocaleDateString()}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="text-center">
            <CardContent className="py-4">
              <BookOpen className="w-5 h-5 mx-auto text-primary mb-1" />
              <p className="text-lg font-bold">{courses.length}</p>
              <p className="text-xs text-muted-foreground">Courses</p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="py-4">
              <Users className="w-5 h-5 mx-auto text-primary mb-1" />
              <p className="text-lg font-bold">{totalStudents}</p>
              <p className="text-xs text-muted-foreground">Students</p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="py-4">
              <Video className="w-5 h-5 mx-auto text-primary mb-1" />
              <p className="text-lg font-bold">{liveClassCount}</p>
              <p className="text-xs text-muted-foreground">Classes</p>
            </CardContent>
          </Card>
        </div>

        {/* About */}
        {tutor.qualifications && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Award className="w-4 h-4 text-primary" />
                Qualifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{tutor.qualifications}</p>
            </CardContent>
          </Card>
        )}

        {tutor.experience && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-primary" />
                Experience
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{tutor.experience}</p>
            </CardContent>
          </Card>
        )}

        {/* Subjects */}
        {tutor.subjects && tutor.subjects.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary" />
                Subjects
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {tutor.subjects.map((subject) => (
                  <Badge key={subject} variant="secondary">
                    {subject}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Courses */}
        {courses.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              Courses by {tutor.full_name.split(' ')[0]}
            </h3>
            {courses.map((course) => (
              <Card key={course.id} className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate('/academy')}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium">{course.name}</h4>
                      {course.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                          {course.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {course.enrollmentCount} enrolled
                        </span>
                        <span className="font-medium text-primary">
                          K{course.price}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TutorProfilePage;
