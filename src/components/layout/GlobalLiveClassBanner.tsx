import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { Video, Play, X, Clock, Crown, RefreshCw, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { haptics } from '@/lib/haptics';
import { sounds, isSoundEnabledState } from '@/lib/sounds';
import { differenceInMinutes } from 'date-fns';
import { cn } from '@/lib/utils';
import { useSwipeGesture } from '@/hooks/useSwipeGesture';

interface LiveClass {
  id: string;
  title: string;
  status: string;
  started_at: string | null;
  scheduled_at: string | null;
  course_id: string;
  host_id: string;
  course_name?: string;
  daily_room_url?: string | null;
  is_recurring?: boolean;
  recurrence_description?: string | null;
}

export const GlobalLiveClassBanner: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { isTutor, isAdmin } = useUserRole();
  const [liveClasses, setLiveClasses] = useState<LiveClass[]>([]);
  const [startingSoonClasses, setStartingSoonClasses] = useState<LiveClass[]>([]);
  const [dismissedClasses, setDismissedClasses] = useState<Set<string>>(new Set());
  const [hasPlayedSound, setHasPlayedSound] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState(false);

  // Don't show on class page itself or auth pages
  const isOnClassPage = location.pathname.includes('/class/') || location.pathname.includes('/live-class/');
  const isOnAuthPage = ['/', '/welcome', '/auth', '/forgot-password', '/reset-password', '/install', '/admin/auth'].includes(location.pathname);

  // Fetch classes based on user role
  const fetchLiveClasses = async () => {
    if (!user) return;

    try {
      let classes: LiveClass[] = [];

      if (isTutor || isAdmin) {
        // For tutors: fetch classes they are hosting
        const { data: tutorClasses, error: tutorError } = await supabase
          .from('live_classes')
          .select('id, title, status, started_at, scheduled_at, course_id, host_id, daily_room_url, is_recurring, recurrence_description, academy_courses(name)')
          .eq('host_id', user.id)
          .in('status', ['live', 'scheduled'])
          .order('scheduled_at', { ascending: true });

        if (!tutorError && tutorClasses) {
          classes = tutorClasses.map(c => ({
            ...c,
            course_name: (c.academy_courses as any)?.name || 'Course'
          }));
        }
      }

      // For students (or additionally for tutors who might also be enrolled)
      const { data: enrollments, error: enrollError } = await supabase
        .from('academy_enrollments')
        .select('course_id, academy_courses(id, name)')
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (!enrollError && enrollments && enrollments.length > 0) {
        const courseIds = enrollments.map(e => e.course_id);
        const courseNames = new Map(
          enrollments.map(e => [e.course_id, (e.academy_courses as any)?.name || 'Course'])
        );

        const { data: studentClasses, error: classError } = await supabase
          .from('live_classes')
          .select('id, title, status, started_at, scheduled_at, course_id, host_id, daily_room_url, is_recurring, recurrence_description')
          .in('course_id', courseIds)
          .in('status', ['live', 'scheduled'])
          .order('scheduled_at', { ascending: true });

        if (!classError && studentClasses) {
          const mappedClasses = studentClasses.map(c => ({
            ...c,
            course_name: courseNames.get(c.course_id)
          }));
          
          // Merge and dedupe
          const existingIds = new Set(classes.map(c => c.id));
          mappedClasses.forEach(c => {
            if (!existingIds.has(c.id)) {
              classes.push(c);
            }
          });
        }
      }

      const now = new Date();

      // Filter live classes
      const live = classes
        .filter(c => c.status === 'live')
        .filter(c => !dismissedClasses.has(c.id));

      // Filter classes starting within 15 minutes
      const startingSoon = classes
        .filter(c => {
          if (c.status !== 'scheduled' || !c.scheduled_at) return false;
          const scheduledTime = new Date(c.scheduled_at);
          const minutesUntil = differenceInMinutes(scheduledTime, now);
          return minutesUntil >= -5 && minutesUntil <= 15;
        })
        .filter(c => !dismissedClasses.has(c.id));

      setLiveClasses(live);
      setStartingSoonClasses(startingSoon);

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
  }, [user, isTutor, isAdmin]);

  // Set up realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('global-live-class-banner')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_classes',
        },
        () => {
          console.log('Live class update received');
          fetchLiveClasses();
        }
      )
      .subscribe();

    const interval = setInterval(fetchLiveClasses, 60000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [user, dismissedClasses, isTutor, isAdmin]);

  const handleJoinClass = (classId: string) => {
    haptics.medium();
    navigate(`/class/${classId}`);
  };

  const handleDismiss = (classId: string) => {
    haptics.light();
    setDismissedClasses(prev => new Set([...prev, classId]));
  };

  const allClasses = [...liveClasses, ...startingSoonClasses];

  // Don't render on class page, auth pages, or if no classes
  if (isOnClassPage || isOnAuthPage || allClasses.length === 0) return null;

  const isHost = (cls: LiveClass) => cls.host_id === user?.id;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 p-2 md:p-3 pointer-events-none">
      <div className="max-w-2xl mx-auto space-y-2 pointer-events-auto">
        {liveClasses.map((cls) => (
          <div
            key={cls.id}
            className="relative rounded-xl p-3 border shadow-xl overflow-hidden backdrop-blur-md bg-gradient-to-r from-red-500/20 via-red-500/15 to-orange-500/15 border-red-500/40"
          >
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm -z-10" />
            
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="relative flex-shrink-0">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
                  </span>
                </div>
                
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold uppercase tracking-wide text-red-500">
                      {isHost(cls) ? 'Your Class is Live' : 'Live Now'}
                    </span>
                    {isHost(cls) && <Crown className="w-3 h-3 text-primary" />}
                    {cls.is_recurring && <RefreshCw className="w-3 h-3 text-muted-foreground" />}
                    {cls.course_name && (
                      <span className="text-xs text-muted-foreground hidden sm:inline">• {cls.course_name}</span>
                    )}
                  </div>
                  <h3 className="font-semibold text-foreground text-sm truncate">
                    {cls.title}
                  </h3>
                  {cls.is_recurring && cls.recurrence_description && (
                    <p className="text-xs text-muted-foreground">{cls.recurrence_description}</p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  onClick={() => handleDismiss(cls.id)}
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3 h-3" />
                </Button>
                <Button
                  onClick={() => handleJoinClass(cls.id)}
                  size="sm"
                  className="font-semibold shadow-md text-white text-xs h-8 bg-red-500 hover:bg-red-600"
                >
                  <Play className="w-3 h-3 mr-1 fill-current" />
                  {isHost(cls) ? 'Manage Class' : 'Join Now'}
                </Button>
              </div>
            </div>
          </div>
        ))}

        {startingSoonClasses.map((cls) => {
          const scheduledTime = cls.scheduled_at ? new Date(cls.scheduled_at) : null;
          const minutesUntil = scheduledTime ? differenceInMinutes(scheduledTime, new Date()) : 0;
          const hasStarted = minutesUntil <= 0;
          const isHosting = isHost(cls);

          return (
            <div
              key={cls.id}
              className={cn(
                "relative rounded-xl p-3 border shadow-xl overflow-hidden backdrop-blur-md",
                hasStarted 
                  ? "bg-gradient-to-r from-orange-500/15 to-yellow-500/10 border-orange-500/30"
                  : "bg-gradient-to-r from-emerald-500/15 to-teal-500/10 border-emerald-500/30"
              )}
            >
              <div className="absolute inset-0 bg-background/80 backdrop-blur-sm -z-10" />
              
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Video className={cn(
                    "w-4 h-4 flex-shrink-0",
                    hasStarted ? "text-orange-500" : "text-emerald-500"
                  )} />
                  
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn(
                        "text-xs font-semibold uppercase tracking-wide",
                        hasStarted ? "text-orange-500" : "text-emerald-500"
                      )}>
                        {isHosting 
                          ? (hasStarted ? 'Your Class Started!' : 'Your Class Starting Soon')
                          : (hasStarted ? 'Class Started!' : 'Starting Soon')
                        }
                      </span>
                      {isHosting && <Crown className="w-3 h-3 text-primary" />}
                      {cls.is_recurring && <RefreshCw className="w-3 h-3 text-muted-foreground" />}
                    </div>
                    <h3 className="font-semibold text-foreground text-sm truncate">
                      {cls.title}
                    </h3>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {hasStarted 
                        ? `Started ${Math.abs(minutesUntil)} min ago`
                        : `Starts in ${minutesUntil} min`
                      }
                      {cls.is_recurring && cls.recurrence_description && (
                        <span className="ml-2">• {cls.recurrence_description}</span>
                      )}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    onClick={() => handleDismiss(cls.id)}
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                  <Button
                    onClick={() => handleJoinClass(cls.id)}
                    size="sm"
                    className={cn(
                      "font-semibold shadow-md text-white text-xs h-8",
                      hasStarted 
                        ? "bg-orange-500 hover:bg-orange-600"
                        : "bg-emerald-500 hover:bg-emerald-600"
                    )}
                  >
                    <Play className="w-3 h-3 mr-1 fill-current" />
                    {isHosting ? 'Start Class' : (hasStarted ? 'Join Now' : 'Join Early')}
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
