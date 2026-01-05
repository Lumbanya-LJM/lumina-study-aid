import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { haptics } from '@/lib/haptics';
import { differenceInMinutes } from 'date-fns';
import { NotificationCenter, NotificationItem } from '@/components/notifications/NotificationCenter';

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
  
  // Persist dismissed classes in localStorage so they don't reappear
  const [dismissedClasses, setDismissedClasses] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('dismissed_class_notifications');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Clean up old entries (older than 24 hours)
        const now = Date.now();
        const filtered = Object.entries(parsed).filter(([, timestamp]) => 
          now - (timestamp as number) < 24 * 60 * 60 * 1000
        );
        return new Set(filtered.map(([id]) => id));
      }
    } catch (e) {
      console.error('Error loading dismissed notifications:', e);
    }
    return new Set();
  });
  const [hasPlayedSound, setHasPlayedSound] = useState<Set<string>>(new Set());

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

      // Haptic only for new live classes (no sound)
      live.forEach(c => {
        if (!hasPlayedSound.has(c.id)) {
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

  // Transform classes to notification format
  const notifications = useMemo((): NotificationItem[] => {
    const now = new Date();
    
    const liveNotifications: NotificationItem[] = liveClasses.map(cls => ({
      id: cls.id,
      title: cls.title,
      subtitle: cls.course_name,
      type: 'live' as const,
      isHost: cls.host_id === user?.id,
      isRecurring: cls.is_recurring,
      recurrenceDescription: cls.recurrence_description,
      metadata: { classId: cls.id },
    }));

    const soonNotifications: NotificationItem[] = startingSoonClasses.map(cls => {
      const scheduledTime = cls.scheduled_at ? new Date(cls.scheduled_at) : null;
      const minutesUntil = scheduledTime ? differenceInMinutes(scheduledTime, now) : 0;
      const hasStarted = minutesUntil <= 0;

      return {
        id: cls.id,
        title: cls.title,
        subtitle: cls.course_name,
        type: hasStarted ? 'started' as const : 'starting-soon' as const,
        isHost: cls.host_id === user?.id,
        isRecurring: cls.is_recurring,
        recurrenceDescription: cls.recurrence_description,
        scheduledAt: cls.scheduled_at,
        metadata: { classId: cls.id },
      };
    });

    return [...liveNotifications, ...soonNotifications];
  }, [liveClasses, startingSoonClasses, user?.id]);

  const handleDismiss = (id: string) => {
    haptics.light();
    setDismissedClasses(prev => {
      const updated = new Set([...prev, id]);
      // Persist to localStorage with timestamp
      try {
        const existing = localStorage.getItem('dismissed_class_notifications');
        const parsed = existing ? JSON.parse(existing) : {};
        parsed[id] = Date.now();
        localStorage.setItem('dismissed_class_notifications', JSON.stringify(parsed));
      } catch (e) {
        console.error('Error saving dismissed notification:', e);
      }
      return updated;
    });
  };

  const handleAction = (id: string) => {
    haptics.medium();
    navigate(`/class/${id}`);
  };

  // Don't render on class page or auth pages
  if (isOnClassPage || isOnAuthPage) return null;

  return (
    <NotificationCenter
      notifications={notifications}
      onDismiss={handleDismiss}
      onAction={handleAction}
      showViewAll={false}
      maxVisible={3}
    />
  );
};
