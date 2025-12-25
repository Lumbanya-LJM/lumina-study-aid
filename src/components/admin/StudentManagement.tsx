import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { 
  Users, Search, GraduationCap, BookOpen, 
  Calendar, ChevronRight, Mail
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface StudentData {
  userId: string;
  fullName: string;
  email: string;
  university: string | null;
  yearOfStudy: number | null;
  enrolledCourses: string[];
  enrollmentCount: number;
  createdAt: string;
}

interface Enrollment {
  id: string;
  courseName: string;
  enrolledAt: string;
  status: string;
}

const StudentManagement: React.FC = () => {
  const { toast } = useToast();
  const [students, setStudents] = useState<StudentData[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<StudentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<StudentData | null>(null);
  const [studentEnrollments, setStudentEnrollments] = useState<Enrollment[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);

  useEffect(() => {
    loadStudents();
  }, []);

  useEffect(() => {
    const query = searchQuery.toLowerCase();
    setFilteredStudents(
      students.filter(s => 
        s.fullName.toLowerCase().includes(query) ||
        s.email.toLowerCase().includes(query) ||
        s.university?.toLowerCase().includes(query)
      )
    );
  }, [searchQuery, students]);

  const loadStudents = async () => {
    try {
      // Get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, university, year_of_study, created_at')
        .order('created_at', { ascending: false })
        .limit(100);

      if (profilesError) throw profilesError;

      // Get enrollments for each user
      const studentDataPromises = (profiles || []).map(async (profile) => {
        const { data: enrollments } = await supabase
          .from('academy_enrollments')
          .select('course_id, academy_courses(name)')
          .eq('user_id', profile.user_id)
          .eq('status', 'active');

        const courseNames = enrollments?.map(e => (e.academy_courses as any)?.name).filter(Boolean) || [];

        // Get email
        const { data: userData } = await supabase.auth.admin.getUserById(profile.user_id);

        return {
          userId: profile.user_id,
          fullName: profile.full_name || 'Unknown',
          email: userData?.user?.email || 'N/A',
          university: profile.university,
          yearOfStudy: profile.year_of_study,
          enrolledCourses: courseNames,
          enrollmentCount: courseNames.length,
          createdAt: profile.created_at
        };
      });

      const studentData = await Promise.all(studentDataPromises);
      setStudents(studentData);
      setFilteredStudents(studentData);
    } catch (error) {
      console.error('Error loading students:', error);
      toast({
        title: 'Error',
        description: 'Failed to load students',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadStudentDetails = async (student: StudentData) => {
    setSelectedStudent(student);
    setDetailsLoading(true);

    try {
      const { data: enrollments, error } = await supabase
        .from('academy_enrollments')
        .select('id, enrolled_at, status, academy_courses(name)')
        .eq('user_id', student.userId)
        .order('enrolled_at', { ascending: false });

      if (error) throw error;

      setStudentEnrollments(
        (enrollments || []).map(e => ({
          id: e.id,
          courseName: (e.academy_courses as any)?.name || 'Unknown Course',
          enrolledAt: e.enrolled_at,
          status: e.status || 'active'
        }))
      );
    } catch (error) {
      console.error('Error loading student details:', error);
    } finally {
      setDetailsLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-ZM', {
      dateStyle: 'medium',
      timeZone: 'Africa/Lusaka'
    });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Student Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search students..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Students List */}
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20" />)}
            </div>
          ) : filteredStudents.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {searchQuery ? 'No students match your search' : 'No students found'}
            </p>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-2 pr-4">
                {filteredStudents.map((student) => (
                  <div
                    key={student.userId}
                    className="p-3 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors cursor-pointer"
                    onClick={() => loadStudentDetails(student)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-sm truncate">{student.fullName}</p>
                          {student.enrollmentCount > 0 && (
                            <Badge variant="secondary" className="text-xs shrink-0">
                              {student.enrollmentCount} course{student.enrollmentCount !== 1 ? 's' : ''}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{student.email}</p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          {student.university && (
                            <span className="flex items-center gap-1">
                              <GraduationCap className="w-3 h-3" />
                              {student.university}
                            </span>
                          )}
                          {student.yearOfStudy && (
                            <span>Year {student.yearOfStudy}</span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          <p className="text-xs text-muted-foreground text-center">
            Showing {filteredStudents.length} of {students.length} students
          </p>
        </CardContent>
      </Card>

      {/* Student Details Dialog */}
      <Dialog open={!!selectedStudent} onOpenChange={() => setSelectedStudent(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Student Details
            </DialogTitle>
          </DialogHeader>

          {selectedStudent && (
            <div className="space-y-4">
              {/* Student Info */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-lg font-bold text-primary">
                      {selectedStudent.fullName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold">{selectedStudent.fullName}</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      {selectedStudent.email}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  {selectedStudent.university && (
                    <div className="p-2 bg-muted rounded">
                      <p className="text-xs text-muted-foreground">University</p>
                      <p className="font-medium">{selectedStudent.university}</p>
                    </div>
                  )}
                  {selectedStudent.yearOfStudy && (
                    <div className="p-2 bg-muted rounded">
                      <p className="text-xs text-muted-foreground">Year of Study</p>
                      <p className="font-medium">Year {selectedStudent.yearOfStudy}</p>
                    </div>
                  )}
                  <div className="p-2 bg-muted rounded">
                    <p className="text-xs text-muted-foreground">Joined</p>
                    <p className="font-medium">{formatDate(selectedStudent.createdAt)}</p>
                  </div>
                  <div className="p-2 bg-muted rounded">
                    <p className="text-xs text-muted-foreground">Enrollments</p>
                    <p className="font-medium">{selectedStudent.enrollmentCount}</p>
                  </div>
                </div>
              </div>

              {/* Enrollments */}
              <div>
                <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  Enrolled Courses
                </h3>
                
                {detailsLoading ? (
                  <div className="space-y-2">
                    {[1, 2].map(i => <Skeleton key={i} className="h-12" />)}
                  </div>
                ) : studentEnrollments.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No course enrollments
                  </p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {studentEnrollments.map((enrollment) => (
                      <div key={enrollment.id} className="p-2 bg-muted/50 rounded flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{enrollment.courseName}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Enrolled {formatDate(enrollment.enrolledAt)}
                          </p>
                        </div>
                        <Badge variant={enrollment.status === 'active' ? 'default' : 'secondary'}>
                          {enrollment.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default StudentManagement;
