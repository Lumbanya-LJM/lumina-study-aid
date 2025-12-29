import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Clock, Video, Link as LinkIcon, Play, Loader2, RefreshCw } from 'lucide-react';
import { fromZonedTime } from 'date-fns-tz';

interface ScheduleClassFormProps {
  courseId: string;
  tutorId: string;
  onSuccess: () => void;
}

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const ScheduleClassForm: React.FC<ScheduleClassFormProps> = ({ courseId, tutorId, onSuccess }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [creatingLiveClass, setCreatingLiveClass] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    classDate: '',
    classTime: '',
    classLink: '',
    isRecurring: false,
    recurrenceDay: '',
    recurrenceTime: ''
  });

  // Reset form when course changes
  React.useEffect(() => {
    setFormData({
      title: '',
      content: '',
      classDate: '',
      classTime: '',
      classLink: '',
      isRecurring: false,
      recurrenceDay: '',
      recurrenceTime: ''
    });
  }, [courseId]);

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
      // Parse date and time as Zambia timezone (CAT - Africa/Lusaka, UTC+2)
      const dateTimeStr = `${formData.classDate}T${formData.classTime}:00`;
      const classDateTime = fromZonedTime(dateTimeStr, 'Africa/Lusaka');
      
      console.log('Scheduling class:', { 
        inputDateTime: dateTimeStr, 
        utcDateTime: classDateTime.toISOString(),
        zambiaTime: classDateTime.toLocaleString('en-ZM', { timeZone: 'Africa/Lusaka' })
      });

      // Create Daily.co room for the scheduled class
      let roomUrl = formData.classLink.trim();
      let roomName = null;
      
      if (!roomUrl) {
        const { data: roomData, error: roomError } = await supabase.functions.invoke('daily-room', {
          body: {
            action: 'create',
            title: formData.title.trim(),
            expiresInMinutes: 180, // 3 hours from creation
          }
        });

        if (roomError) {
          console.error('Daily room creation error:', roomError);
          toast({
            title: 'Warning',
            description: 'Could not auto-generate video room. You can add a link manually later.',
            variant: 'default'
          });
        } else if (roomData?.success) {
          roomUrl = roomData.roomUrl;
          roomName = roomData.roomName;
          console.log('Daily room created:', roomData);
        }
      }

      // Build recurrence description
      const recurrenceDescription = formData.isRecurring && formData.recurrenceDay && formData.recurrenceTime
        ? `Every ${formData.recurrenceDay} at ${formData.recurrenceTime}`
        : null;

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
          daily_room_name: roomName,
          daily_room_url: roomUrl || null,
          is_recurring: formData.isRecurring,
          recurrence_day: formData.isRecurring ? formData.recurrenceDay : null,
          recurrence_time: formData.isRecurring ? formData.recurrenceTime : null,
          recurrence_description: recurrenceDescription,
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
          class_link: roomUrl || null,
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
          await supabase.functions.invoke('send-student-notification', {
            body: {
              type: 'class_scheduled',
              courseId,
              data: {
                title: formData.title.trim(),
                description: formData.content?.trim() || undefined,
                classId: liveClassData?.id,
                scheduledAt: classDateTime.toISOString(),
              }
            }
          });
          console.log('Email notification sent for class scheduled');
        } catch (e) {
          console.error('Failed to send email notifications:', e);
        }
      } else {
        console.log('No enrolled students found to notify');
      }

      toast({
        title: 'Success',
        description: formData.isRecurring 
          ? `Recurring class scheduled! Students will see: "${formData.recurrenceDay} at ${formData.recurrenceTime}"`
          : roomUrl 
            ? 'Class scheduled with video room! Students have been notified.'
            : 'Class scheduled successfully! Students have been notified.',
      });

      setFormData({ title: '', content: '', classDate: '', classTime: '', classLink: '', isRecurring: false, recurrenceDay: '', recurrenceTime: '' });
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
      // Create Daily.co room with recording enabled
      const { data: roomData, error: roomError } = await supabase.functions.invoke('daily-room', {
        body: {
          action: 'create',
          title: formData.title.trim(),
          expiresInMinutes: 180, // 3 hours
        }
      });

      if (roomError || !roomData?.success) {
        throw new Error(roomError?.message || roomData?.error || 'Failed to create video room');
      }

      const roomUrl = roomData.roomUrl;
      const roomName = roomData.roomName;

      console.log('Daily room created:', roomData);

      // Note: Recording will be auto-started when host joins the room
      // Cannot start recording before participants join

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
          daily_room_name: roomName,
          daily_room_url: roomUrl,
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
          class_link: roomUrl,
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
        description: error instanceof Error ? error.message : 'Failed to create live class. Please try again.',
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
          {!courseId ? (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">
                You don't have any courses assigned yet. Please contact an admin to assign courses to your profile.
              </p>
            </div>
          ) : (
            <>
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
                disabled={creatingLiveClass || !formData.title.trim()}
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
                Classes are recorded automatically with AI transcription
              </p>
            </>
          )}
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
              <Label htmlFor="classLink">External Link (optional - leave empty for embedded class)</Label>
              <div className="relative">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="classLink"
                  type="url"
                  className="pl-10"
                  placeholder="https://... or leave empty for Lumina classroom"
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

            {/* Recurring Class Settings */}
            <Card className="border-dashed">
              <CardContent className="pt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-muted-foreground" />
                    <Label htmlFor="isRecurring" className="font-medium">Recurring Class</Label>
                  </div>
                  <Switch
                    id="isRecurring"
                    checked={formData.isRecurring}
                    onCheckedChange={(checked) => setFormData({ ...formData, isRecurring: checked })}
                  />
                </div>
                
                {formData.isRecurring && (
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="space-y-2">
                      <Label>Day of Week</Label>
                      <Select
                        value={formData.recurrenceDay}
                        onValueChange={(value) => setFormData({ ...formData, recurrenceDay: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select day" />
                        </SelectTrigger>
                        <SelectContent>
                          {DAYS_OF_WEEK.map((day) => (
                            <SelectItem key={day} value={day}>{day}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Recurring Time</Label>
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          type="time"
                          className="pl-10"
                          value={formData.recurrenceTime}
                          onChange={(e) => setFormData({ ...formData, recurrenceTime: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                )}
                
                {formData.isRecurring && formData.recurrenceDay && formData.recurrenceTime && (
                  <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                    Students will see: <span className="font-medium">"Classes held every {formData.recurrenceDay} at {formData.recurrenceTime}"</span>
                  </p>
                )}
              </CardContent>
            </Card>

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
