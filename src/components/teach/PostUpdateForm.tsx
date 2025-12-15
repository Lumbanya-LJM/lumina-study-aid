import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Send, Bell, BookOpen, AlertCircle, Info } from 'lucide-react';

interface PostUpdateFormProps {
  courseId: string;
  tutorId: string;
  onSuccess: () => void;
}

const updateTypes = [
  { value: 'general', label: 'General Update', icon: Info },
  { value: 'announcement', label: 'Announcement', icon: Bell },
  { value: 'resource', label: 'Resource', icon: BookOpen },
  { value: 'alert', label: 'Important Alert', icon: AlertCircle },
];

const PostUpdateForm: React.FC<PostUpdateFormProps> = ({ courseId, tutorId, onSuccess }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    updateType: 'general'
  });

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

      toast({
        title: 'Success',
        description: 'Update posted successfully! Students will be notified.',
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="w-5 h-5" />
          Post Update
        </CardTitle>
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
                      <type.icon className="w-4 h-4" />
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
            <Label htmlFor="content">Content *</Label>
            <Textarea
              id="content"
              placeholder="Write your update message here..."
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              rows={5}
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground text-right">
              {formData.content.length}/1000
            </p>
          </div>

          <Button type="submit" className="w-full" disabled={loading || !courseId}>
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Posting...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Send className="w-4 h-4" />
                Post Update
              </span>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default PostUpdateForm;
