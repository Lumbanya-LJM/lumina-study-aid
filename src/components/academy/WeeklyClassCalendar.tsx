import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar, Clock, RefreshCw, Video, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfWeek, addDays, isSameDay, addWeeks, subWeeks } from 'date-fns';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface RecurringClass {
  id: string;
  title: string;
  description: string | null;
  course_id: string | null;
  recurrence_day: string | null;
  recurrence_time: string | null;
  recurrence_description: string | null;
  is_recurring: boolean;
  scheduled_at: string | null;
  status: string;
  course_name?: string;
}

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const WeeklyClassCalendar: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [recurringClasses, setRecurringClasses] = useState<RecurringClass[]>([]);
  const [scheduledClasses, setScheduledClasses] = useState<RecurringClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 0 }));

  useEffect(() => {
    if (user?.id) {
      loadClasses();
    }
  }, [user?.id]);

  const loadClasses = async () => {
    if (!user?.id) return;
    setLoading(true);

    try {
      // Get user's enrolled courses
      const { data: enrollments } = await supabase
        .from('academy_enrollments')
        .select('course_id')
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (!enrollments || enrollments.length === 0) {
        setRecurringClasses([]);
        setScheduledClasses([]);
        setLoading(false);
        return;
      }

      const courseIds = enrollments.map(e => e.course_id);

      // Get course names
      const { data: courses } = await supabase
        .from('academy_courses')
        .select('id, name')
        .in('id', courseIds);

      const courseMap = new Map(courses?.map(c => [c.id, c.name]) || []);

      // Get recurring classes (pattern-based)
      const { data: recurring } = await supabase
        .from('live_classes')
        .select('*')
        .in('course_id', courseIds)
        .eq('is_recurring', true)
        .in('status', ['scheduled', 'live']);

      // Get all scheduled classes for the week view
      const { data: scheduled } = await supabase
        .from('live_classes')
        .select('*')
        .in('course_id', courseIds)
        .in('status', ['scheduled', 'live'])
        .order('scheduled_at', { ascending: true });

      // Add course names
      const recurringWithNames = (recurring || []).map(c => ({
        ...c,
        course_name: courseMap.get(c.course_id || '') || 'Unknown Course'
      }));

      const scheduledWithNames = (scheduled || []).map(c => ({
        ...c,
        course_name: courseMap.get(c.course_id || '') || 'Unknown Course'
      }));

      setRecurringClasses(recurringWithNames);
      setScheduledClasses(scheduledWithNames);
    } catch (error) {
      console.error('Error loading classes:', error);
    } finally {
      setLoading(false);
    }
  };

  const getClassesForDay = (dayIndex: number) => {
    const dayName = DAYS_OF_WEEK[dayIndex].toLowerCase();
    const dayDate = addDays(currentWeekStart, dayIndex);

    // Get recurring classes for this day of week
    const recurring = recurringClasses.filter(c => 
      c.recurrence_day?.toLowerCase() === dayName
    );

    // Get specifically scheduled classes for this date
    const scheduled = scheduledClasses.filter(c => {
      if (!c.scheduled_at) return false;
      return isSameDay(new Date(c.scheduled_at), dayDate);
    });

    // Combine and deduplicate (prefer scheduled over recurring if same class)
    const scheduledIds = new Set(scheduled.map(s => s.id));
    const uniqueRecurring = recurring.filter(r => !scheduledIds.has(r.id));

    return [...scheduled, ...uniqueRecurring];
  };

  const formatTime = (timeStr: string | null, scheduledAt: string | null) => {
    if (scheduledAt) {
      return format(new Date(scheduledAt), 'HH:mm');
    }
    if (timeStr) {
      // Time is in format "HH:MM:SS"
      const parts = timeStr.split(':');
      return `${parts[0]}:${parts[1]}`;
    }
    return 'TBA';
  };

  const goToPreviousWeek = () => {
    setCurrentWeekStart(prev => subWeeks(prev, 1));
  };

  const goToNextWeek = () => {
    setCurrentWeekStart(prev => addWeeks(prev, 1));
  };

  const goToCurrentWeek = () => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 0 }));
  };

  if (loading) {
    return (
      <Card className="border-border/50">
        <CardContent className="py-8 text-center">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/3 mx-auto" />
            <div className="h-20 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasAnyClasses = recurringClasses.length > 0 || scheduledClasses.length > 0;

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            Weekly Class Schedule
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goToPreviousWeek}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" className="text-xs" onClick={goToCurrentWeek}>
              Today
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goToNextWeek}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {format(currentWeekStart, 'MMM d')} - {format(addDays(currentWeekStart, 6), 'MMM d, yyyy')}
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        {!hasAnyClasses ? (
          <div className="text-center py-8">
            <Calendar className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">No scheduled classes</p>
            <p className="text-xs text-muted-foreground mt-1">
              Your class schedule will appear here
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[300px]">
            <div className="space-y-2">
              {DAYS_OF_WEEK.map((day, index) => {
                const dayDate = addDays(currentWeekStart, index);
                const isToday = isSameDay(dayDate, new Date());
                const classes = getClassesForDay(index);

                return (
                  <div
                    key={day}
                    className={cn(
                      "rounded-lg p-3 border transition-colors",
                      isToday 
                        ? "border-primary/30 bg-primary/5" 
                        : "border-border/30 bg-card/50",
                      classes.length === 0 && "opacity-60"
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "text-sm font-medium",
                          isToday ? "text-primary" : "text-foreground"
                        )}>
                          {day}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(dayDate, 'MMM d')}
                        </span>
                        {isToday && (
                          <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-primary/30 text-primary">
                            Today
                          </Badge>
                        )}
                      </div>
                      {classes.length > 0 && (
                        <Badge variant="secondary" className="text-[10px] py-0">
                          {classes.length} class{classes.length > 1 ? 'es' : ''}
                        </Badge>
                      )}
                    </div>

                    {classes.length > 0 ? (
                      <div className="space-y-2">
                        {classes.map((cls) => (
                          <div
                            key={cls.id}
                            className="flex items-center gap-3 p-2 rounded-lg bg-background/50 border border-border/30 hover:border-primary/30 transition-colors cursor-pointer"
                            onClick={() => cls.status === 'live' && navigate(`/class/${cls.id}`)}
                          >
                            <div className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                              cls.status === 'live' 
                                ? "bg-red-500/10" 
                                : "bg-primary/10"
                            )}>
                              {cls.is_recurring ? (
                                <RefreshCw className={cn(
                                  "w-4 h-4",
                                  cls.status === 'live' ? "text-red-500" : "text-primary"
                                )} />
                              ) : (
                                <Video className={cn(
                                  "w-4 h-4",
                                  cls.status === 'live' ? "text-red-500" : "text-primary"
                                )} />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-foreground truncate">
                                  {cls.title}
                                </span>
                                {cls.status === 'live' && (
                                  <span className="flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                                    <span className="text-[10px] text-red-500 font-medium">LIVE</span>
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Clock className="w-3 h-3" />
                                <span>{formatTime(cls.recurrence_time, cls.scheduled_at)} CAT</span>
                                <span>•</span>
                                <span className="truncate">{cls.course_name}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground pl-1">No classes</p>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
