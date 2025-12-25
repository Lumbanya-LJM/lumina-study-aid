import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Users, Search, Download, UserPlus, UserMinus,
  CheckCircle, XCircle, FileSpreadsheet, Filter
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';

interface Student {
  userId: string;
  fullName: string;
  email: string;
  university: string | null;
}

interface Course {
  id: string;
  name: string;
  institution: string | null;
}

interface EnrollmentData {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  university: string | null;
  courseName: string;
  courseId: string;
  enrolledAt: string;
  status: string;
}

const BulkEnrollmentManager: React.FC = () => {
  const { toast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Selection state
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [selectedEnrollments, setSelectedEnrollments] = useState<Set<string>>(new Set());
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [courseFilter, setCourseFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Dialogs
  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false);
  const [unenrollDialogOpen, setUnenrollDialogOpen] = useState(false);
  const [selectedCourseForEnroll, setSelectedCourseForEnroll] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load courses
      const { data: coursesData, error: coursesError } = await supabase
        .from('academy_courses')
        .select('id, name, institution')
        .eq('is_active', true)
        .order('name');

      if (coursesError) throw coursesError;
      setCourses(coursesData || []);

      // Load all enrollments with student and course info
      const { data: enrollmentsData, error: enrollmentsError } = await supabase
        .from('academy_enrollments')
        .select(`
          id,
          user_id,
          enrolled_at,
          status,
          course_id,
          academy_courses(name)
        `)
        .order('enrolled_at', { ascending: false });

      if (enrollmentsError) throw enrollmentsError;

      // Load profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, university');

      if (profilesError) throw profilesError;

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      
      // Map enrollments with profile data
      const mappedEnrollments: EnrollmentData[] = (enrollmentsData || []).map(e => {
        const profile = profileMap.get(e.user_id);
        return {
          id: e.id,
          userId: e.user_id,
          fullName: profile?.full_name || 'Unknown',
          email: '', // Will be populated if needed
          university: profile?.university || null,
          courseName: (e.academy_courses as any)?.name || 'Unknown Course',
          courseId: e.course_id,
          enrolledAt: e.enrolled_at,
          status: e.status || 'active'
        };
      });

      setEnrollments(mappedEnrollments);

      // Get unique students from profiles
      const studentsList: Student[] = (profiles || []).map(p => ({
        userId: p.user_id,
        fullName: p.full_name || 'Unknown',
        email: '',
        university: p.university
      }));

      setStudents(studentsList);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load enrollment data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredEnrollments = enrollments.filter(e => {
    const matchesSearch = 
      e.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.courseName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCourse = courseFilter === 'all' || e.courseId === courseFilter;
    const matchesStatus = statusFilter === 'all' || e.status === statusFilter;
    return matchesSearch && matchesCourse && matchesStatus;
  });

  const filteredStudents = students.filter(s =>
    s.fullName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectAllEnrollments = (checked: boolean) => {
    if (checked) {
      setSelectedEnrollments(new Set(filteredEnrollments.map(e => e.id)));
    } else {
      setSelectedEnrollments(new Set());
    }
  };

  const handleSelectAllStudents = (checked: boolean) => {
    if (checked) {
      setSelectedStudents(new Set(filteredStudents.map(s => s.userId)));
    } else {
      setSelectedStudents(new Set());
    }
  };

  const toggleEnrollmentSelection = (id: string) => {
    const newSet = new Set(selectedEnrollments);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedEnrollments(newSet);
  };

  const toggleStudentSelection = (userId: string) => {
    const newSet = new Set(selectedStudents);
    if (newSet.has(userId)) {
      newSet.delete(userId);
    } else {
      newSet.add(userId);
    }
    setSelectedStudents(newSet);
  };

  const handleBulkEnroll = async () => {
    if (!selectedCourseForEnroll || selectedStudents.size === 0) return;

    setActionLoading(true);
    try {
      const enrollmentRecords = Array.from(selectedStudents).map(userId => ({
        user_id: userId,
        course_id: selectedCourseForEnroll,
        status: 'active'
      }));

      const { error } = await supabase
        .from('academy_enrollments')
        .upsert(enrollmentRecords, { 
          onConflict: 'user_id,course_id',
          ignoreDuplicates: false 
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Enrolled ${selectedStudents.size} students in the course`,
      });

      setEnrollDialogOpen(false);
      setSelectedStudents(new Set());
      setSelectedCourseForEnroll('');
      loadData();
    } catch (error) {
      console.error('Error bulk enrolling:', error);
      toast({
        title: 'Error',
        description: 'Failed to enroll students',
        variant: 'destructive'
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkUnenroll = async () => {
    if (selectedEnrollments.size === 0) return;

    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('academy_enrollments')
        .update({ status: 'inactive' })
        .in('id', Array.from(selectedEnrollments));

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Unenrolled ${selectedEnrollments.size} enrollments`,
      });

      setUnenrollDialogOpen(false);
      setSelectedEnrollments(new Set());
      loadData();
    } catch (error) {
      console.error('Error bulk unenrolling:', error);
      toast({
        title: 'Error',
        description: 'Failed to unenroll students',
        variant: 'destructive'
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleExportData = () => {
    const dataToExport = selectedEnrollments.size > 0
      ? enrollments.filter(e => selectedEnrollments.has(e.id))
      : filteredEnrollments;

    const csvContent = [
      ['Student Name', 'University', 'Course', 'Enrolled Date', 'Status'].join(','),
      ...dataToExport.map(e => [
        `"${e.fullName}"`,
        `"${e.university || 'N/A'}"`,
        `"${e.courseName}"`,
        new Date(e.enrolledAt).toLocaleDateString('en-ZM', { timeZone: 'Africa/Lusaka' }),
        e.status
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `enrollments_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    toast({
      title: 'Exported',
      description: `Exported ${dataToExport.length} enrollment records`,
    });
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
            Bulk Enrollment Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Actions Bar */}
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => setEnrollDialogOpen(true)}
              size="sm"
              className="gap-2"
            >
              <UserPlus className="w-4 h-4" />
              Bulk Enroll
            </Button>
            <Button
              onClick={() => setUnenrollDialogOpen(true)}
              variant="outline"
              size="sm"
              className="gap-2"
              disabled={selectedEnrollments.size === 0}
            >
              <UserMinus className="w-4 h-4" />
              Unenroll Selected ({selectedEnrollments.size})
            </Button>
            <Button
              onClick={handleExportData}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search students or courses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={courseFilter} onValueChange={setCourseFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by course" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Courses</SelectItem>
                {courses.map(course => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Select All */}
          <div className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={selectedEnrollments.size === filteredEnrollments.length && filteredEnrollments.length > 0}
              onCheckedChange={handleSelectAllEnrollments}
            />
            <span className="text-muted-foreground">
              Select all ({filteredEnrollments.length} enrollments)
            </span>
          </div>

          {/* Enrollments List */}
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-14" />)}
            </div>
          ) : filteredEnrollments.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No enrollments found
            </p>
          ) : (
            <ScrollArea className="h-[350px]">
              <div className="space-y-2 pr-4">
                {filteredEnrollments.map((enrollment) => (
                  <div
                    key={enrollment.id}
                    className={`p-3 rounded-lg border transition-colors ${
                      selectedEnrollments.has(enrollment.id) 
                        ? 'bg-primary/10 border-primary/30' 
                        : 'bg-muted/50 border-transparent hover:bg-muted/70'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={selectedEnrollments.has(enrollment.id)}
                        onCheckedChange={() => toggleEnrollmentSelection(enrollment.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="font-medium text-sm truncate">{enrollment.fullName}</p>
                          <Badge 
                            variant={enrollment.status === 'active' ? 'default' : 'secondary'}
                            className="shrink-0"
                          >
                            {enrollment.status === 'active' ? (
                              <CheckCircle className="w-3 h-3 mr-1" />
                            ) : (
                              <XCircle className="w-3 h-3 mr-1" />
                            )}
                            {enrollment.status}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          <span className="font-medium text-foreground/80">{enrollment.courseName}</span>
                          {enrollment.university && <span>• {enrollment.university}</span>}
                          <span>• {formatDate(enrollment.enrolledAt)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          <p className="text-xs text-muted-foreground text-center">
            Showing {filteredEnrollments.length} enrollments
            {selectedEnrollments.size > 0 && ` • ${selectedEnrollments.size} selected`}
          </p>
        </CardContent>
      </Card>

      {/* Bulk Enroll Dialog */}
      <Dialog open={enrollDialogOpen} onOpenChange={setEnrollDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Bulk Enroll Students
            </DialogTitle>
            <DialogDescription>
              Select students and a course to enroll them in.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Course Selection */}
            <div>
              <label className="text-sm font-medium mb-2 block">Select Course</label>
              <Select value={selectedCourseForEnroll} onValueChange={setSelectedCourseForEnroll}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a course..." />
                </SelectTrigger>
                <SelectContent>
                  {courses.map(course => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.name} {course.institution && `(${course.institution})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Students Selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Select Students</label>
                <div className="flex items-center gap-2 text-xs">
                  <Checkbox
                    checked={selectedStudents.size === filteredStudents.length && filteredStudents.length > 0}
                    onCheckedChange={handleSelectAllStudents}
                  />
                  <span>Select all</span>
                </div>
              </div>
              
              <Input
                placeholder="Search students..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="mb-2"
              />

              <ScrollArea className="h-[200px] border rounded-md p-2">
                <div className="space-y-1">
                  {filteredStudents.map(student => (
                    <div
                      key={student.userId}
                      className={`p-2 rounded flex items-center gap-2 cursor-pointer transition-colors ${
                        selectedStudents.has(student.userId) 
                          ? 'bg-primary/10' 
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => toggleStudentSelection(student.userId)}
                    >
                      <Checkbox
                        checked={selectedStudents.has(student.userId)}
                        onCheckedChange={() => toggleStudentSelection(student.userId)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{student.fullName}</p>
                        {student.university && (
                          <p className="text-xs text-muted-foreground">{student.university}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <p className="text-xs text-muted-foreground mt-1">
                {selectedStudents.size} students selected
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEnrollDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleBulkEnroll}
              disabled={!selectedCourseForEnroll || selectedStudents.size === 0 || actionLoading}
            >
              {actionLoading ? 'Enrolling...' : `Enroll ${selectedStudents.size} Students`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Unenroll Dialog */}
      <Dialog open={unenrollDialogOpen} onOpenChange={setUnenrollDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserMinus className="w-5 h-5" />
              Confirm Unenrollment
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to unenroll {selectedEnrollments.size} selected enrollments? 
              This will set their status to inactive.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setUnenrollDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={handleBulkUnenroll}
              disabled={actionLoading}
            >
              {actionLoading ? 'Processing...' : `Unenroll ${selectedEnrollments.size} Students`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BulkEnrollmentManager;
