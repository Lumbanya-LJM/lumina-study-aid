import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  BookOpen, Plus, Trash2, Edit2, Check, X, 
  Loader2, GraduationCap, Building 
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Course {
  id: string;
  name: string;
  description: string | null;
  institution: string | null;
  is_active: boolean | null;
  price: number;
  created_at: string;
  school: 'law' | 'business' | 'health' | null;
  tutor_id: string | null;
  tutor_profile?: { full_name: string | null } | null;
}

interface Tutor {
  id: string;
  full_name: string | null;
}

interface ApiError {
  message: string;
}

const CourseManagement: React.FC = () => {
  const { toast } = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    institution: 'ZIALE',
    price: 350,
    is_active: true,
    school: 'law' as 'law' | 'business' | 'health',
    tutor_id: ''
  });

  const loadCoursesAndTutors = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch courses - tutor_id is directly on academy_courses
      const { data: coursesData, error: coursesError } = await supabase
        .from('academy_courses')
        .select('*')
        .order('institution', { ascending: true })
        .order('name', { ascending: true });

      if (coursesError) throw coursesError;

      // Get tutor profiles for any courses with tutor_id
      const tutorIds = [...new Set(coursesData?.filter(c => c.tutor_id).map(c => c.tutor_id) || [])];
      let tutorProfiles: Record<string, string | null> = {};
      
      if (tutorIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', tutorIds);
        
        tutorProfiles = (profiles || []).reduce((acc, p) => {
          acc[p.user_id] = p.full_name;
          return acc;
        }, {} as Record<string, string | null>);
      }

      // Merge tutor info into courses
      const coursesWithTutors: Course[] = (coursesData || []).map(c => ({
        ...c,
        tutor_profile: c.tutor_id ? { full_name: tutorProfiles[c.tutor_id] || null } : null
      }));

      // Fetch all tutors for the dropdown
      const { data: allTutors, error: tutorsError } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .order('full_name', { ascending: true });

      if (tutorsError) throw tutorsError;

      setCourses(coursesWithTutors);
      setTutors((allTutors || []).map(t => ({ id: t.user_id, full_name: t.full_name })));
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load courses or tutors',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadCoursesAndTutors();
  }, [loadCoursesAndTutors]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setSaving(true);
    try {
      let courseId = editingCourse?.id;

      if (editingCourse) {
        const { error } = await supabase
          .from('academy_courses')
          .update({
            name: formData.name.trim(),
            description: formData.description.trim() || null,
            institution: formData.institution,
            price: formData.price,
            is_active: formData.is_active,
            school: formData.school
          })
          .eq('id', editingCourse.id);

        if (error) throw error;
        toast({ title: 'Success', description: 'Course updated successfully' });
      } else {
        const { data, error } = await supabase
          .from('academy_courses')
          .insert({
            name: formData.name.trim(),
            description: formData.description.trim() || null,
            institution: formData.institution,
            price: formData.price,
            is_active: formData.is_active,
            school: formData.school
          })
          .select('id')
          .single();

        if (error) throw error;
        courseId = data.id;
        toast({ title: 'Success', description: 'Course added successfully' });
      }

      // Handle tutor assignment - tutor_id is directly on academy_courses
      if (courseId) {
        const { error: tutorError } = await supabase
          .from('academy_courses')
          .update({ tutor_id: formData.tutor_id || null })
          .eq('id', courseId);

        if (tutorError) throw tutorError;
      }

      setDialogOpen(false);
      resetForm();
      loadCoursesAndTutors();
    } catch (error) {
      console.error('Error saving course:', error);
      toast({
        title: 'Error',
        description: 'Failed to save course',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (course: Course) => {
    setEditingCourse(course);
    setFormData({
      name: course.name,
      description: course.description || '',
      institution: course.institution || 'ZIALE',
      price: course.price,
      is_active: course.is_active ?? true,
      school: course.school || 'law',
      tutor_id: course.tutor_id || ''
    });
    setDialogOpen(true);
  };

  const handleToggleActive = async (course: Course) => {
    try {
      const { error } = await supabase
        .from('academy_courses')
        .update({ is_active: !course.is_active })
        .eq('id', course.id);

      if (error) throw error;
      loadCoursesAndTutors();
      toast({
        title: 'Success',
        description: `Course ${course.is_active ? 'deactivated' : 'activated'}`
      });
    } catch (error) {
      console.error('Error toggling course:', error);
      toast({
        title: 'Error',
        description: 'Failed to update course status',
        variant: 'destructive'
      });
    }
  };

  const handleDelete = async (courseId: string) => {
    if (!confirm('Are you sure you want to delete this course? This cannot be undone.')) return;

    try {
      const { error } = await supabase
        .from('academy_courses')
        .delete()
        .eq('id', courseId);

      if (error) throw error;
      loadCoursesAndTutors();
      toast({ title: 'Success', description: 'Course deleted successfully' });
    } catch (error) {
      const apiError = error as ApiError;
      console.error('Error deleting course:', apiError);
      toast({
        title: 'Error',
        description: apiError.message?.includes('violates foreign key')
          ? 'Cannot delete course with active enrollments'
          : 'Failed to delete course',
        variant: 'destructive'
      });
    }
  };

  const resetForm = () => {
    setEditingCourse(null);
    setFormData({
      name: '',
      description: '',
      institution: 'ZIALE',
      price: 350,
      is_active: true,
      school: 'law',
      tutor_id: ''
    });
  };

  const zialeCourses = courses.filter(c => c.institution === 'ZIALE');
  const universityCourses = courses.filter(c => c.institution === 'University');

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          Course Management
        </CardTitle>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1">
              <Plus className="w-4 h-4" />
              Add Course
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingCourse ? 'Edit Course' : 'Add New Course'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Course Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Constitutional Law"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief course description..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="school">School</Label>
                  <Select
                    value={formData.school}
                    onValueChange={(value: 'law' | 'business' | 'health') => setFormData({ ...formData, school: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="law">School of Law</SelectItem>
                      <SelectItem value="business">School of Business</SelectItem>
                      <SelectItem value="health">School of Health</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="institution">Institution</Label>
                  <Select
                    value={formData.institution}
                    onValueChange={(value) => setFormData({ ...formData, institution: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {formData.school === 'law' && (
                        <>
                          <SelectItem value="ZIALE">ZIALE</SelectItem>
                          <SelectItem value="University">University</SelectItem>
                        </>
                      )}
                      {formData.school === 'business' && (
                        <>
                          <SelectItem value="ZICPA">ZICA</SelectItem>
                          <SelectItem value="University">University</SelectItem>
                        </>
                      )}
                      {formData.school === 'health' && (
                        <>
                          <SelectItem value="Medical School">Medical School</SelectItem>
                          <SelectItem value="Nursing School">Nursing School</SelectItem>
                          <SelectItem value="University">University</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tutor">Assign Tutor</Label>
                <Select
                  value={formData.tutor_id}
                  onValueChange={(value) => setFormData({ ...formData, tutor_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a tutor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {tutors.map((tutor) => (
                      <SelectItem key={tutor.id} value={tutor.id}>
                        {tutor.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Price (ZMW)</Label>
                  <Input
                    id="price"
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    min={0}
                  />
                </div>

                <div className="flex items-center justify-between pt-6">
                  <Label htmlFor="is_active">Active Course</Label>
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" disabled={saving} className="flex-1">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingCourse ? 'Update' : 'Add')}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent className="space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* ZIALE Courses */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <GraduationCap className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-sm">ZIALE Courses ({zialeCourses.length})</h3>
              </div>
              <div className="space-y-2">
                {zialeCourses.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">No ZIALE courses</p>
                ) : (
                  zialeCourses.map((course) => (
                    <CourseItem 
                      key={course.id} 
                      course={course} 
                      onEdit={handleEdit}
                      onToggle={handleToggleActive}
                      onDelete={handleDelete}
                    />
                  ))
                )}
              </div>
            </div>

            {/* University Courses */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Building className="w-4 h-4 text-blue-500" />
                <h3 className="font-semibold text-sm">University Courses ({universityCourses.length})</h3>
              </div>
              <div className="space-y-2">
                {universityCourses.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">No university courses</p>
                ) : (
                  universityCourses.map((course) => (
                    <CourseItem 
                      key={course.id} 
                      course={course} 
                      onEdit={handleEdit}
                      onToggle={handleToggleActive}
                      onDelete={handleDelete}
                    />
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

const CourseItem: React.FC<{
  course: Course;
  onEdit: (course: Course) => void;
  onToggle: (course: Course) => void;
  onDelete: (id: string) => void;
}> = ({ course, onEdit, onToggle, onDelete }) => {
  const assignedTutor = course.tutor_profile?.full_name;

  return (
    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm truncate">{course.name}</p>
          <Badge variant={course.is_active ? 'default' : 'secondary'} className="text-xs">
            {course.is_active ? 'Active' : 'Inactive'}
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>K{course.price}</span>
          {assignedTutor && (
            <>
              <span>•</span>
              <span>{assignedTutor}</span>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 ml-2">
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onToggle(course)}>
          {course.is_active ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}
        </Button>
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onEdit(course)}>
          <Edit2 className="w-4 h-4" />
        </Button>
        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => onDelete(course.id)}>
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default CourseManagement;
