import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Video, Play, X, Clock, Crown, RefreshCw, ChevronDown, ChevronUp, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { haptics } from '@/lib/haptics';
import { differenceInMinutes } from 'date-fns';
import { cn } from '@/lib/utils';

export interface NotificationItem {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  type: 'live' | 'starting-soon' | 'started' | 'info';
  isHost?: boolean;
  isRecurring?: boolean;
  recurrenceDescription?: string;
  scheduledAt?: string | null;
  metadata?: Record<string, any>;
}

interface SwipeableNotificationProps {
  notification: NotificationItem;
  onDismiss: (id: string) => void;
  onAction: (id: string) => void;
  index: number;
}

const SwipeableNotification: React.FC<SwipeableNotificationProps> = ({
  notification,
  onDismiss,
  onAction,
  index,
}) => {
  const [translateX, setTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - startXRef.current;
    // Only allow swiping right (positive values)
    if (diff > 0) {
      setTranslateX(Math.min(diff, 200));
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    if (translateX > 100) {
      // Swipe threshold reached - dismiss
      haptics.light();
      setTranslateX(400);
      setTimeout(() => onDismiss(notification.id), 200);
    } else {
      setTranslateX(0);
    }
  };

  const scheduledTime = notification.scheduledAt ? new Date(notification.scheduledAt) : null;
  const minutesUntil = scheduledTime ? differenceInMinutes(scheduledTime, new Date()) : 0;
  const hasStarted = minutesUntil <= 0;

  const getTypeStyles = () => {
    switch (notification.type) {
      case 'live':
        return {
          gradient: 'from-red-500/20 via-red-500/15 to-orange-500/15',
          border: 'border-red-500/40',
          accent: 'text-red-500',
          button: 'bg-red-500 hover:bg-red-600',
        };
      case 'started':
        return {
          gradient: 'from-orange-500/15 to-yellow-500/10',
          border: 'border-orange-500/30',
          accent: 'text-orange-500',
          button: 'bg-orange-500 hover:bg-orange-600',
        };
      case 'starting-soon':
        return {
          gradient: 'from-emerald-500/15 to-teal-500/10',
          border: 'border-emerald-500/30',
          accent: 'text-emerald-500',
          button: 'bg-emerald-500 hover:bg-emerald-600',
        };
      default:
        return {
          gradient: 'from-primary/15 to-primary/5',
          border: 'border-primary/30',
          accent: 'text-primary',
          button: 'bg-primary hover:bg-primary/90',
        };
    }
  };

  const styles = getTypeStyles();

  const getLabel = () => {
    if (notification.type === 'live') {
      return notification.isHost ? 'Your Class is Live' : 'Live Now';
    }
    if (notification.type === 'started') {
      return notification.isHost ? 'Your Class Started!' : 'Class Started!';
    }
    if (notification.type === 'starting-soon') {
      return notification.isHost ? 'Your Class Starting Soon' : 'Starting Soon';
    }
    return 'Notification';
  };

  const getActionLabel = () => {
    if (notification.type === 'live') {
      return notification.isHost ? 'Manage Class' : 'Join Now';
    }
    if (notification.type === 'started') {
      return notification.isHost ? 'Start Class' : 'Join Now';
    }
    if (notification.type === 'starting-soon') {
      return notification.isHost ? 'Start Class' : 'Join Early';
    }
    return 'View';
  };

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden"
      style={{
        animationDelay: `${index * 50}ms`,
      }}
    >
      {/* Swipe indicator background */}
      <div className="absolute inset-0 bg-emerald-500/20 rounded-xl flex items-center pl-4">
        <span className="text-emerald-500 text-sm font-medium">Dismiss</span>
      </div>

      {/* Main notification card */}
      <div
        className={cn(
          "relative rounded-xl p-3 border shadow-lg overflow-hidden backdrop-blur-md transition-transform",
          `bg-gradient-to-r ${styles.gradient} ${styles.border}`
        )}
        style={{
          transform: `translateX(${translateX}px)`,
          transition: isDragging ? 'none' : 'transform 0.2s ease-out',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="absolute inset-0 bg-background/85 backdrop-blur-sm -z-10" />

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {notification.type === 'live' ? (
              <div className="relative flex-shrink-0">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
                </span>
              </div>
            ) : (
              <Video className={cn("w-4 h-4 flex-shrink-0", styles.accent)} />
            )}

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={cn("text-xs font-bold uppercase tracking-wide", styles.accent)}>
                  {getLabel()}
                </span>
                {notification.isHost && <Crown className="w-3 h-3 text-primary" />}
                {notification.isRecurring && <RefreshCw className="w-3 h-3 text-muted-foreground" />}
                {notification.subtitle && (
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    • {notification.subtitle}
                  </span>
                )}
              </div>
              <h3 className="font-semibold text-foreground text-sm truncate">
                {notification.title}
              </h3>
              {(notification.type === 'starting-soon' || notification.type === 'started') && scheduledTime && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {hasStarted
                    ? `Started ${Math.abs(minutesUntil)} min ago`
                    : `Starts in ${minutesUntil} min`}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              onClick={() => onDismiss(notification.id)}
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3 h-3" />
            </Button>
            <Button
              onClick={() => onAction(notification.id)}
              size="sm"
              className={cn("font-semibold shadow-md text-white text-xs h-8", styles.button)}
            >
              <Play className="w-3 h-3 mr-1 fill-current" />
              {getActionLabel()}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface NotificationCenterProps {
  notifications: NotificationItem[];
  onDismiss: (id: string) => void;
  onAction: (id: string) => void;
  maxVisible?: number;
  className?: string;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  notifications,
  onDismiss,
  onAction,
  maxVisible = 3,
  className,
}) => {
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();

  if (notifications.length === 0) return null;

  const visibleNotifications = expanded ? notifications : notifications.slice(0, maxVisible);
  const hiddenCount = notifications.length - maxVisible;
  const hasMore = hiddenCount > 0;

  return (
    <div className={cn("fixed top-0 left-0 right-0 z-50 p-2 md:p-3 pointer-events-none", className)}>
      <div className="max-w-2xl mx-auto space-y-2 pointer-events-auto">
        {visibleNotifications.map((notification, index) => (
          <SwipeableNotification
            key={notification.id}
            notification={notification}
            onDismiss={onDismiss}
            onAction={onAction}
            index={index}
          />
        ))}

        {/* Stack indicator / Expand button */}
        {hasMore && !expanded && (
          <button
            onClick={() => {
              haptics.light();
              setExpanded(true);
            }}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-muted/80 backdrop-blur-sm border border-border/50 text-sm text-muted-foreground hover:bg-muted transition-colors"
          >
            <Bell className="w-4 h-4" />
            <span>+{hiddenCount} more notification{hiddenCount > 1 ? 's' : ''}</span>
            <ChevronDown className="w-4 h-4" />
          </button>
        )}

        {/* Collapse button when expanded */}
        {expanded && hasMore && (
          <button
            onClick={() => {
              haptics.light();
              setExpanded(false);
            }}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-muted/80 backdrop-blur-sm border border-border/50 text-sm text-muted-foreground hover:bg-muted transition-colors"
          >
            <span>Show less</span>
            <ChevronUp className="w-4 h-4" />
          </button>
        )}

        {/* Quick link to notification center */}
        {notifications.length > 0 && (
          <button
            onClick={() => {
              haptics.light();
              navigate('/notifications');
            }}
            className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
          >
            View all notifications →
          </button>
        )}
      </div>
    </div>
  );
};
