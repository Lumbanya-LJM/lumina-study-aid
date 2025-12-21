import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Send, Bell, BookOpen, AlertCircle, Info, Users, Loader2 } from 'lucide-react';

interface PostUpdateFormProps {
  courseId: string;
  tutorId: string;
  onSuccess: () => void;
}

const updateTypes = [
  { value: 'general', label: 'General Update', icon: Info, color: 'text-primary' },
  { value: 'announcement', label: 'Announcement', icon: Bell, color: 'text-yellow-500' },
  { value: 'resource', label: 'New Resource', icon: BookOpen, color: 'text-green-500' },
  { value: 'alert', label: 'Important Alert', icon: AlertCircle, color: 'text-red-500' },
];

const PostUpdateForm: React.FC<PostUpdateFormProps> = ({ courseId, tutorId, onSuccess }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [enrolledCount, setEnrolledCount] = useState(0);
  const [courseName, setCourseName] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    updateType: 'general'
  });

  useEffect(() => {
    if (courseId) {
      loadCourseInfo();
    }
  }, [courseId]);

  const loadCourseInfo = async () => {
    try {
      // Get course name
      const { data: courseData } = await supabase
        .from('academy_courses')
        .select('name')
        .eq('id', courseId)
        .single();
      
      if (courseData) {
        setCourseName(courseData.name);
      }

      // Get enrolled students count
      const { count } = await supabase
        .from('academy_enrollments')
        .select('*', { count: 'exact', head: true })
        .eq('course_id', courseId)
        .eq('status', 'active');

      setEnrolledCount(count || 0);
    } catch (error) {
      console.error('Error loading course info:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!courseId) {
      toast({
        title: 'Error',
        description: 'Please select a course first',
        variant: 'destructive'
      });
      return;
    }

    if (!formData.title.trim() || !formData.content.trim()) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('tutor_updates')
        .insert({
          course_id: courseId,
          tutor_id: tutorId,
          title: formData.title.trim(),
          content: formData.content.trim(),
          update_type: formData.updateType,
          is_published: true
        });

      if (error) throw error;

      // Send push notifications to enrolled students
      const { data: enrollments } = await supabase
        .from('academy_enrollments')
        .select('user_id')
        .eq('course_id', courseId)
        .eq('status', 'active');

      if (enrollments && enrollments.length > 0) {
        const userIds = enrollments.map(e => e.user_id);
        supabase.functions.invoke('send-push-notification', {
          body: {
            userIds,
            payload: {
              title: `📢 ${formData.title}`,
              body: formData.content.substring(0, 100) + (formData.content.length > 100 ? '...' : ''),
              tag: 'tutor-update'
            }
          }
        });
      }

      toast({
        title: 'Update Posted!',
        description: `${enrolledCount} student(s) will be notified.`,
      });

      setFormData({ title: '', content: '', updateType: 'general' });
      onSuccess();
    } catch (error) {
      console.error('Error posting update:', error);
      toast({
        title: 'Error',
        description: 'Failed to post update',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedType = updateTypes.find(t => t.value === formData.updateType);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="w-5 h-5" />
          Post Update
        </CardTitle>
        {courseName && (
          <CardDescription className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Posting to <span className="font-medium text-foreground">{courseName}</span> • {enrolledCount} enrolled student(s)
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="updateType">Update Type</Label>
            <Select
              value={formData.updateType}
              onValueChange={(value) => setFormData({ ...formData, updateType: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {updateTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex items-center gap-2">
                      <type.icon className={`w-4 h-4 ${type.color}`} />
                      {type.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="Enter update title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Message *</Label>
            <Textarea
              id="content"
              placeholder="Write your message to students..."
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              rows={5}
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground text-right">
              {formData.content.length}/1000
            </p>
          </div>

          {/* Preview */}
          {formData.title && (
            <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
              <p className="text-xs text-muted-foreground mb-2">Preview:</p>
              <div className="flex items-start gap-3">
                {selectedType && (
                  <div className={`p-2 rounded-full bg-background ${selectedType.color}`}>
                    <selectedType.icon className="w-4 h-4" />
                  </div>
                )}
                <div>
                  <h4 className="font-medium text-sm">{formData.title}</h4>
                  {formData.content && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {formData.content}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading || !courseId}>
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Posting...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Send className="w-4 h-4" />
                Post to {enrolledCount} Student(s)
              </span>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default PostUpdateForm;
