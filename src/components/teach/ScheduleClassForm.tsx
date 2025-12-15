import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Clock, Video, Link as LinkIcon } from 'lucide-react';

interface ScheduleClassFormProps {
  courseId: string;
  tutorId: string;
  onSuccess: () => void;
}

const ScheduleClassForm: React.FC<ScheduleClassFormProps> = ({ courseId, tutorId, onSuccess }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    classDate: '',
    classTime: '',
    classLink: ''
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

    if (!formData.title.trim() || !formData.classDate || !formData.classTime) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const classDateTime = new Date(`${formData.classDate}T${formData.classTime}`);

      const { error } = await supabase
        .from('tutor_updates')
        .insert({
          course_id: courseId,
          tutor_id: tutorId,
          title: formData.title.trim(),
          content: formData.content.trim() || `Live class scheduled for ${classDateTime.toLocaleString()}`,
          update_type: 'class',
          class_time: classDateTime.toISOString(),
          class_link: formData.classLink.trim() || null,
          is_published: true
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Class scheduled successfully! Students will be notified.',
      });

      setFormData({ title: '', content: '', classDate: '', classTime: '', classLink: '' });
      onSuccess();
    } catch (error) {
      console.error('Error scheduling class:', error);
      toast({
        title: 'Error',
        description: 'Failed to schedule class',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Get minimum date (today)
  const minDate = new Date().toISOString().split('T')[0];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Video className="w-5 h-5" />
          Schedule Live Class
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="classTitle">Class Title *</Label>
            <Input
              id="classTitle"
              placeholder="e.g., Week 3: Contract Law Fundamentals"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              maxLength={100}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="classDate">Date *</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="classDate"
                  type="date"
                  className="pl-10"
                  value={formData.classDate}
                  onChange={(e) => setFormData({ ...formData, classDate: e.target.value })}
                  min={minDate}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="classTime">Time *</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="classTime"
                  type="time"
                  className="pl-10"
                  value={formData.classTime}
                  onChange={(e) => setFormData({ ...formData, classTime: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="classLink">Meeting Link (Zoom/Google Meet)</Label>
            <div className="relative">
              <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="classLink"
                type="url"
                className="pl-10"
                placeholder="https://zoom.us/j/..."
                value={formData.classLink}
                onChange={(e) => setFormData({ ...formData, classLink: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="classContent">Additional Notes</Label>
            <Textarea
              id="classContent"
              placeholder="Topics to be covered, preparation required, etc."
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              rows={3}
              maxLength={500}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading || !courseId}>
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Scheduling...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Schedule Class
              </span>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default ScheduleClassForm;
