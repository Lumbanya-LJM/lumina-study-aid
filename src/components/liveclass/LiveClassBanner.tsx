import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Video, Play, X, Users, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { haptics } from '@/lib/haptics';
import { sounds, isSoundEnabledState } from '@/lib/sounds';
import { formatDistanceToNow, differenceInMinutes, isBefore, addMinutes } from 'date-fns';
import { cn } from '@/lib/utils';

interface LiveClass {
  id: string;
  title: string;
  status: string;
  started_at: string | null;
  scheduled_at: string | null;
  course_id: string;
  course_name?: string;
  daily_room_url?: string | null;
}

export const LiveClassBanner: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [liveClasses, setLiveClasses] = useState<LiveClass[]>([]);
  const [startingSoonClasses, setStartingSoonClasses] = useState<LiveClass[]>([]);
  const [dismissedClasses, setDismissedClasses] = useState<Set<string>>(new Set());
  const [hasPlayedSound, setHasPlayedSound] = useState<Set<string>>(new Set());

  // Fetch enrolled courses and their live/scheduled classes
  const fetchLiveClasses = async () => {
    if (!user) return;

    try {
      // Get user's enrolled courses
      const { data: enrollments, error: enrollError } = await supabase
        .from('academy_enrollments')
        .select('course_id, academy_courses(id, name)')
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (enrollError) {
        console.error('Error fetching enrollments:', enrollError);
        return;
      }

      if (!enrollments || enrollments.length === 0) return;

      const courseIds = enrollments.map(e => e.course_id);
      const courseNames = new Map(
        enrollments.map(e => [e.course_id, (e.academy_courses as any)?.name || 'Course'])
      );

      // Get live classes for enrolled courses
      const { data: classes, error: classError } = await supabase
        .from('live_classes')
        .select('id, title, status, started_at, scheduled_at, course_id, daily_room_url')
        .in('course_id', courseIds)
        .in('status', ['live', 'scheduled'])
        .order('scheduled_at', { ascending: true });

      if (classError) {
        console.error('Error fetching live classes:', classError);
        return;
      }

      if (!classes) return;

      const now = new Date();

      // Filter live classes
      const live = classes
        .filter(c => c.status === 'live')
        .map(c => ({
          ...c,
          course_name: courseNames.get(c.course_id)
        }));

      // Filter classes starting within 15 minutes
      const startingSoon = classes
        .filter(c => {
          if (c.status !== 'scheduled' || !c.scheduled_at) return false;
          const scheduledTime = new Date(c.scheduled_at);
          const minutesUntil = differenceInMinutes(scheduledTime, now);
          // Show if scheduled time is within -5 to +15 minutes (already started or starting soon)
          return minutesUntil >= -5 && minutesUntil <= 15;
        })
        .map(c => ({
          ...c,
          course_name: courseNames.get(c.course_id)
        }));

      setLiveClasses(live.filter(c => !dismissedClasses.has(c.id)));
      setStartingSoonClasses(startingSoon.filter(c => !dismissedClasses.has(c.id)));

      // Play sound for new live classes
      live.forEach(c => {
        if (!hasPlayedSound.has(c.id) && isSoundEnabledState()) {
          sounds.classStart();
          setHasPlayedSound(prev => new Set([...prev, c.id]));
          haptics.heavy();
        }
      });
    } catch (error) {
      console.error('Error in fetchLiveClasses:', error);
    }
  };

  // Initial fetch
  useEffect(() => {
    if (user) {
      fetchLiveClasses();
    }
  }, [user]);

  // Set up realtime subscription
  useEffect(() => {
    if (!user) return;

    // Subscribe to live_classes changes
    const channel = supabase
      .channel('live-class-banner')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_classes',
        },
        (payload) => {
          console.log('Live class update received:', payload);
          fetchLiveClasses();
        }
      )
      .subscribe();

    // Also check every minute for scheduled classes about to start
    const interval = setInterval(fetchLiveClasses, 60000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [user, dismissedClasses]);

  const handleJoinClass = (classId: string) => {
    haptics.medium();
    navigate(`/class/${classId}`);
  };

  const handleDismiss = (classId: string) => {
    haptics.light();
    setDismissedClasses(prev => new Set([...prev, classId]));
  };

  const allClasses = [...liveClasses, ...startingSoonClasses];

  if (allClasses.length === 0) return null;

  return (
    <div className="space-y-3 mb-6 animate-fade-in-up">
      {liveClasses.map((cls) => (
        <div
          key={cls.id}
          className="relative bg-gradient-to-r from-red-500/15 via-red-500/10 to-orange-500/10 rounded-2xl p-4 border border-red-500/30 shadow-lg overflow-hidden"
        >
          {/* Animated background pulse */}
          <div className="absolute inset-0 bg-red-500/5 animate-pulse" />
          
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
              </span>
              <span className="text-sm font-bold text-red-500 uppercase tracking-wide">
                Live Now
              </span>
              {cls.course_name && (
                <span className="text-xs text-muted-foreground">• {cls.course_name}</span>
              )}
            </div>
            
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground text-base truncate">
                  {cls.title}
                </h3>
                {cls.started_at && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <Clock className="w-3 h-3" />
                    Started {formatDistanceToNow(new Date(cls.started_at), { addSuffix: true })}
                  </p>
                )}
              </div>
              
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  onClick={() => handleDismiss(cls.id)}
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </Button>
                <Button
                  onClick={() => handleJoinClass(cls.id)}
                  size="sm"
                  className="bg-red-500 hover:bg-red-600 text-white font-semibold shadow-md"
                >
                  <Play className="w-4 h-4 mr-1.5 fill-current" />
                  Join Now
                </Button>
              </div>
            </div>
          </div>
        </div>
      ))}

      {startingSoonClasses.map((cls) => {
        const scheduledTime = cls.scheduled_at ? new Date(cls.scheduled_at) : null;
        const minutesUntil = scheduledTime ? differenceInMinutes(scheduledTime, new Date()) : 0;
        const isStartingSoon = minutesUntil > 0;
        const hasStarted = minutesUntil <= 0;

        return (
          <div
            key={cls.id}
            className={cn(
              "relative rounded-2xl p-4 border shadow-md overflow-hidden",
              hasStarted 
                ? "bg-gradient-to-r from-orange-500/15 to-yellow-500/10 border-orange-500/30"
                : "bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border-emerald-500/20"
            )}
          >
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <Video className={cn(
                  "w-4 h-4",
                  hasStarted ? "text-orange-500" : "text-emerald-500"
                )} />
                <span className={cn(
                  "text-sm font-semibold uppercase tracking-wide",
                  hasStarted ? "text-orange-500" : "text-emerald-500"
                )}>
                  {hasStarted ? 'Class Started!' : 'Starting Soon'}
                </span>
                {cls.course_name && (
                  <span className="text-xs text-muted-foreground">• {cls.course_name}</span>
                )}
              </div>
              
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground text-base truncate">
                    {cls.title}
                  </h3>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <Clock className="w-3 h-3" />
                    {hasStarted 
                      ? `Started ${Math.abs(minutesUntil)} min ago`
                      : `Starts in ${minutesUntil} min`
                    }
                  </p>
                </div>
                
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    onClick={() => handleDismiss(cls.id)}
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={() => handleJoinClass(cls.id)}
                    size="sm"
                    className={cn(
                      "font-semibold shadow-md",
                      hasStarted 
                        ? "bg-orange-500 hover:bg-orange-600 text-white"
                        : "bg-emerald-500 hover:bg-emerald-600 text-white"
                    )}
                  >
                    <Play className="w-4 h-4 mr-1.5 fill-current" />
                    {hasStarted ? 'Join Now' : 'Join Early'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
