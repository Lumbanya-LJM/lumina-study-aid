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
}

interface ApiError {
  message: string;
}

const CourseManagement: React.FC = () => {
  const { toast } = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    institution: 'ZIALE',
    price: 350,
    is_active: true
  });

  const loadCourses = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('academy_courses')
        .select('*')
        .order('institution', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      setCourses(data || []);
    } catch (error) {
      console.error('Error loading courses:', error);
      toast({
        title: 'Error',
        description: 'Failed to load courses',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setSaving(true);
    try {
      if (editingCourse) {
        const { error } = await supabase
          .from('academy_courses')
          .update({
            name: formData.name.trim(),
            description: formData.description.trim() || null,
            institution: formData.institution,
            price: formData.price,
            is_active: formData.is_active
          })
          .eq('id', editingCourse.id);

        if (error) throw error;
        toast({ title: 'Success', description: 'Course updated successfully' });
      } else {
        const { error } = await supabase
          .from('academy_courses')
          .insert({
            name: formData.name.trim(),
            description: formData.description.trim() || null,
            institution: formData.institution,
            price: formData.price,
            is_active: formData.is_active
          });

        if (error) throw error;
        toast({ title: 'Success', description: 'Course added successfully' });
      }

      setDialogOpen(false);
      resetForm();
      loadCourses();
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
      is_active: course.is_active ?? true
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
      loadCourses();
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
      loadCourses();
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
      is_active: true
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
                  <Label htmlFor="institution">Institution</Label>
                  <Select
                    value={formData.institution}
                    onValueChange={(value) => setFormData({ ...formData, institution: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ZIALE">ZIALE</SelectItem>
                      <SelectItem value="University">University</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

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
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="is_active">Active Course</Label>
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
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
}> = ({ course, onEdit, onToggle, onDelete }) => (
  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <p className="font-medium text-sm truncate">{course.name}</p>
        <Badge variant={course.is_active ? 'default' : 'secondary'} className="text-xs">
          {course.is_active ? 'Active' : 'Inactive'}
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground">K{course.price}</p>
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

export default CourseManagement;
