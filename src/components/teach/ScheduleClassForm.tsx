import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Clock, Video, Link as LinkIcon, Play, Loader2 } from 'lucide-react';

interface ScheduleClassFormProps {
  courseId: string;
  tutorId: string;
  onSuccess: () => void;
}

const ScheduleClassForm: React.FC<ScheduleClassFormProps> = ({ courseId, tutorId, onSuccess }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [creatingLiveClass, setCreatingLiveClass] = useState(false);
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
      // Parse date and time in Zambia timezone (CAT - UTC+2)
      const dateTimeStr = `${formData.classDate}T${formData.classTime}:00`;
      const localDate = new Date(dateTimeStr);
      const zambiaOffset = 2 * 60; // minutes
      const localOffset = localDate.getTimezoneOffset();
      const classDateTime = new Date(localDate.getTime() + (localOffset + zambiaOffset) * 60 * 1000);

      // Auto-generate Zoom meeting link if not provided
      let zoomUrl = formData.classLink.trim();
      let meetingId = null;
      
      if (!zoomUrl) {
        const { data: meetingData, error: meetingError } = await supabase.functions.invoke('zoom-meeting', {
          body: {
            action: 'create',
            topic: formData.title.trim(),
            duration: 60,
            startTime: classDateTime.toISOString(),
          }
        });

        if (meetingError) {
          console.error('Zoom meeting creation error:', meetingError);
          toast({
            title: 'Warning',
            description: 'Could not auto-generate Zoom link. You can add it manually later.',
            variant: 'default'
          });
        } else {
          zoomUrl = meetingData?.joinUrl || '';
          meetingId = meetingData?.meetingId || null;
        }
      }

      // Create a live_classes entry for scheduled class
      const { data: liveClassData, error: liveClassError } = await supabase
        .from('live_classes')
        .insert({
          title: formData.title.trim(),
          description: formData.content.trim() || null,
          host_id: tutorId,
          course_id: courseId,
          status: 'scheduled',
          scheduled_at: classDateTime.toISOString(),
          daily_room_name: meetingId,
          daily_room_url: zoomUrl || null,
        })
        .select()
        .single();

      if (liveClassError) throw liveClassError;

      // Also create a tutor update to notify students on portal
      const { error: updateError } = await supabase
        .from('tutor_updates')
        .insert({
          course_id: courseId,
          tutor_id: tutorId,
          title: `📅 Class Scheduled: ${formData.title.trim()}`,
          content: formData.content.trim() || `Live class scheduled for ${classDateTime.toLocaleString()}`,
          update_type: 'class',
          class_time: classDateTime.toISOString(),
          class_link: zoomUrl || null,
          is_published: true
        });

      if (updateError) console.error('Error creating update:', updateError);

      // Send immediate notifications to enrolled students
      const { data: enrollments } = await supabase
        .from('academy_enrollments')
        .select('user_id')
        .eq('course_id', courseId)
        .eq('status', 'active');

      if (enrollments && enrollments.length > 0) {
        const userIds = enrollments.map(e => e.user_id);
        console.log(`Sending notifications to ${userIds.length} enrolled students`);
        
        // Send push notifications immediately
        try {
          const { error: pushError } = await supabase.functions.invoke('send-push-notification', {
            body: {
              userIds,
              payload: {
                title: '📅 New Class Scheduled!',
                body: `${formData.title.trim()} has been scheduled. Check the app for details.`,
                icon: '/pwa-192x192.png',
                data: { 
                  type: 'class_scheduled',
                  classId: liveClassData?.id,
                },
              },
            },
          });
          if (pushError) console.error('Push notification error:', pushError);
        } catch (e) {
          console.error('Failed to send push notifications:', e);
        }

        // Send email notifications via edge function
        try {
          const { data: emailResult, error: emailError } = await supabase.functions.invoke('send-class-update-notification', {
            body: {
              classId: liveClassData?.id,
              courseId,
              classTitle: formData.title.trim(),
              scheduledAt: classDateTime.toISOString(),
              meetingLink: zoomUrl || null,
              updateType: 'scheduled'
            }
          });
          if (emailError) {
            console.error('Email notification error:', emailError);
          } else {
            console.log('Email notification result:', emailResult);
          }
        } catch (e) {
          console.error('Failed to send email notifications:', e);
        }
      } else {
        console.log('No enrolled students found to notify');
      }

      toast({
        title: 'Success',
        description: zoomUrl 
          ? 'Class scheduled with Zoom link! Students have been notified.'
          : 'Class scheduled successfully! Students have been notified.',
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

  const handleStartLiveClass = async () => {
    if (!courseId) {
      toast({
        title: 'Error',
        description: 'Please select a course first',
        variant: 'destructive'
      });
      return;
    }

    if (!formData.title.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a class title',
        variant: 'destructive'
      });
      return;
    }

    setCreatingLiveClass(true);
    try {
      // Create Zoom meeting via edge function
      const { data: meetingData, error: meetingError } = await supabase.functions.invoke('zoom-meeting', {
        body: {
          action: 'create',
          topic: formData.title.trim(),
          duration: 60,
        }
      });

      if (meetingError) throw meetingError;

      const zoomUrl = meetingData.joinUrl;
      const meetingId = meetingData.meetingId;

      // Create live_classes entry
      const { data: liveClassData, error: liveClassError } = await supabase
        .from('live_classes')
        .insert({
          title: formData.title.trim(),
          description: formData.content.trim() || null,
          host_id: tutorId,
          course_id: courseId,
          status: 'live',
          started_at: new Date().toISOString(),
          daily_room_name: meetingId,
          daily_room_url: zoomUrl,
        })
        .select()
        .single();

      if (liveClassError) throw liveClassError;

      // Create tutor update for notification
      await supabase
        .from('tutor_updates')
        .insert({
          course_id: courseId,
          tutor_id: tutorId,
          title: `🔴 Live Now: ${formData.title.trim()}`,
          content: formData.content.trim() || 'The tutor is now live! Join the class.',
          update_type: 'class',
          class_time: new Date().toISOString(),
          class_link: zoomUrl,
          is_published: true
        });

      // Send push notifications to enrolled students
      const { data: enrollments } = await supabase
        .from('academy_enrollments')
        .select('user_id')
        .eq('course_id', courseId)
        .eq('status', 'active');

      if (enrollments && enrollments.length > 0) {
        const userIds = enrollments.map(e => e.user_id);
        await supabase.functions.invoke('send-push-notification', {
          body: {
            userIds,
            payload: {
              title: '🔴 Live Class Started!',
              body: `${formData.title.trim()} is now live! Join now.`,
              tag: 'live-class',
              data: { classId: liveClassData.id, url: `/live-class/${liveClassData.id}` }
            }
          }
        });
      }

      toast({
        title: 'Live Class Created!',
        description: 'Redirecting you to the classroom...',
      });

      // Redirect to live class room
      window.location.href = `/live-class/${liveClassData.id}`;
    } catch (error) {
      console.error('Error creating live class:', error);
      toast({
        title: 'Error',
        description: 'Failed to create live class. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setCreatingLiveClass(false);
    }
  };

  // Get minimum date (today)
  const minDate = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-4">
      {/* Start Live Class Now */}
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <Play className="w-5 h-5" />
            Start Live Class Now
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="liveTitle">Class Title *</Label>
            <Input
              id="liveTitle"
              placeholder="e.g., Constitutional Law Discussion"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="liveNotes">Topic/Notes</Label>
            <Textarea
              id="liveNotes"
              placeholder="Brief description for students..."
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              rows={2}
              maxLength={500}
            />
          </div>

          <Button 
            onClick={handleStartLiveClass} 
            className="w-full gradient-primary" 
            disabled={creatingLiveClass || !courseId || !formData.title.trim()}
          >
            {creatingLiveClass ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating Classroom...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Video className="w-4 h-4" />
                Go Live Now
              </span>
            )}
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Students will be notified immediately and can join the live class
          </p>
        </CardContent>
      </Card>

      {/* Schedule Future Class */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Schedule Future Class
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
              <Label htmlFor="classLink">Meeting Link (optional - will auto-generate if empty)</Label>
              <div className="relative">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="classLink"
                  type="url"
                  className="pl-10"
                  placeholder="https://zoom.us/j/... or leave empty for Lumina class"
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

            <Button type="submit" variant="outline" className="w-full" disabled={loading || !courseId}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
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
    </div>
  );
};

export default ScheduleClassForm;
