import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { GraduationCap, Loader2, Check, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Course {
  id: string;
  name: string;
  description: string | null;
  institution: string | null;
  price: number;
}

interface AddCourseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  enrolledCourseIds: string[];
  onEnrollmentSuccess: () => void;
}

export const AddCourseModal: React.FC<AddCourseModalProps> = ({
  open,
  onOpenChange,
  enrolledCourseIds,
  onEnrollmentSuccess
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => {
    if (open) {
      loadAvailableCourses();
    }
  }, [open]);

  const loadAvailableCourses = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('academy_courses')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      
      // Filter out already enrolled courses
      const filtered = (data || []).filter(
        course => !enrolledCourseIds.includes(course.id)
      );
      setAvailableCourses(filtered);
    } catch (error) {
      console.error('Error loading courses:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load available courses'
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleCourse = (courseId: string) => {
    setSelectedCourses(prev => 
      prev.includes(courseId)
        ? prev.filter(id => id !== courseId)
        : [...prev, courseId]
    );
  };

  const handleEnroll = async () => {
    if (!user || selectedCourses.length === 0) return;
    
    setEnrolling(true);
    try {
      // Create enrollments for selected courses
      const enrollments = selectedCourses.map(courseId => ({
        user_id: user.id,
        course_id: courseId,
        status: 'active'
      }));

      const { error } = await supabase
        .from('academy_enrollments')
        .insert(enrollments);

      if (error) throw error;

      toast({
        title: 'Enrolled Successfully!',
        description: `You've been enrolled in ${selectedCourses.length} course${selectedCourses.length > 1 ? 's' : ''}`,
      });

      setSelectedCourses([]);
      onOpenChange(false);
      onEnrollmentSuccess();
    } catch (error) {
      console.error('Error enrolling:', error);
      toast({
        variant: 'destructive',
        title: 'Enrollment Failed',
        description: 'There was an error processing your enrollment'
      });
    } finally {
      setEnrolling(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-primary" />
            Add More Courses
          </DialogTitle>
          <DialogDescription>
            Select additional courses to enroll in
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : availableCourses.length === 0 ? (
            <div className="text-center py-8">
              <GraduationCap className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground font-medium">No More Courses Available</p>
              <p className="text-sm text-muted-foreground mt-1">
                You're already enrolled in all available courses
              </p>
            </div>
          ) : (
            availableCourses.map((course) => {
              const isSelected = selectedCourses.includes(course.id);
              return (
                <button
                  key={course.id}
                  onClick={() => toggleCourse(course.id)}
                  className={cn(
                    "w-full text-left rounded-2xl p-4 border transition-all",
                    isSelected
                      ? "border-primary bg-primary/5 shadow-glow"
                      : "border-border/50 bg-card hover:border-primary/30"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                      isSelected ? "bg-primary" : "bg-primary/10"
                    )}>
                      {isSelected ? (
                        <Check className="w-5 h-5 text-primary-foreground" />
                      ) : (
                        <GraduationCap className="w-5 h-5 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground">{course.name}</h3>
                      <p className="text-xs text-muted-foreground">{course.institution}</p>
                      {course.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {course.description}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {availableCourses.length > 0 && (
          <div className="pt-4 border-t border-border">
            <Button
              onClick={handleEnroll}
              disabled={selectedCourses.length === 0 || enrolling}
              className="w-full"
            >
              {enrolling ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enrolling...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Enroll in {selectedCourses.length || 0} Course{selectedCourses.length !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
