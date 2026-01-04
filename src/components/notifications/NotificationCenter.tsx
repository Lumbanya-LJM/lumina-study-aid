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
  const [isDismissing, setIsDismissing] = useState(false);
  const startXRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isDismissing) return;
    startXRef.current = e.touches[0].clientX;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || isDismissing) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - startXRef.current;
    // Only allow swiping right (positive values)
    if (diff > 0) {
      setTranslateX(Math.min(diff, 200));
    }
  };

  const handleTouchEnd = () => {
    if (isDismissing) return;
    setIsDragging(false);
    if (translateX > 100) {
      // Swipe threshold reached - dismiss with animation
      haptics.light();
      setIsDismissing(true);
      setTimeout(() => onDismiss(notification.id), 300);
    } else {
      setTranslateX(0);
    }
  };

  const handleXButtonClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    haptics.light();
    setIsDismissing(true);
    setTimeout(() => onDismiss(notification.id), 300);
  };

  // Don't render if dismissing animation is complete
  if (isDismissing && translateX === 0) {
    // For X button dismissal - slide out then hide
  }

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
      className={cn(
        "relative overflow-hidden transition-all duration-300 ease-out",
        isDismissing && "opacity-0 max-h-0 mb-0 scale-95"
      )}
      style={{
        animationDelay: `${index * 50}ms`,
        maxHeight: isDismissing ? 0 : 100,
        marginBottom: isDismissing ? 0 : undefined,
      }}
    >
      {/* Main notification card - compact design */}
      <div
        className={cn(
          "relative rounded-lg p-2 border shadow-md overflow-hidden backdrop-blur-md bg-card",
          `bg-gradient-to-r ${styles.gradient} ${styles.border}`
        )}
        style={{
          transform: `translateX(${isDismissing ? 400 : translateX}px)`,
          transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          willChange: 'transform',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="absolute inset-0 bg-background/90 backdrop-blur-sm -z-10" />

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {notification.type === 'live' ? (
              <div className="relative flex-shrink-0">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                </span>
              </div>
            ) : (
              <Video className={cn("w-3 h-3 flex-shrink-0", styles.accent)} />
            )}

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className={cn("text-[10px] font-bold uppercase tracking-wide", styles.accent)}>
                  {getLabel()}
                </span>
                {notification.isHost && <Crown className="w-2.5 h-2.5 text-primary" />}
                {notification.isRecurring && <RefreshCw className="w-2.5 h-2.5 text-muted-foreground" />}
              </div>
              <p className="font-medium text-foreground text-xs truncate">
                {notification.title}
                {notification.subtitle && (
                  <span className="text-muted-foreground font-normal"> • {notification.subtitle}</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <Button
              onClick={handleXButtonClick}
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-destructive/10"
            >
              <X className="w-3 h-3" />
            </Button>
            <Button
              onClick={() => onAction(notification.id)}
              size="sm"
              className={cn("font-medium shadow-sm text-white text-[10px] h-6 px-2", styles.button)}
            >
              <Play className="w-2.5 h-2.5 mr-0.5 fill-current" />
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
  showViewAll?: boolean;
  className?: string;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  notifications,
  onDismiss,
  onAction,
  maxVisible = 2,
  showViewAll = true,
  className,
}) => {
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();

  if (notifications.length === 0) return null;

  const visibleNotifications = expanded ? notifications : notifications.slice(0, maxVisible);
  const hiddenCount = notifications.length - maxVisible;
  const hasMore = hiddenCount > 0;

  return (
    <div className={cn("fixed top-0 left-0 right-0 z-50 p-1.5 md:p-2 pointer-events-none", className)}>
      <div className="max-w-xl mx-auto space-y-1 pointer-events-auto">
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
            className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-muted/80 backdrop-blur-sm border border-border/50 text-xs text-muted-foreground hover:bg-muted transition-colors"
          >
            <Bell className="w-3 h-3" />
            <span>+{hiddenCount} more</span>
            <ChevronDown className="w-3 h-3" />
          </button>
        )}

        {/* Collapse button when expanded */}
        {expanded && hasMore && (
          <button
            onClick={() => {
              haptics.light();
              setExpanded(false);
            }}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-muted/80 backdrop-blur-sm border border-border/50 text-xs text-muted-foreground hover:bg-muted transition-colors"
          >
            <span>Show less</span>
            <ChevronUp className="w-3 h-3" />
          </button>
        )}

        {/* Quick link to notification center */}
        {showViewAll && notifications.length > 0 && (
          <button
            onClick={() => {
              haptics.light();
              navigate('/notifications');
            }}
            className="w-full text-center text-[10px] text-muted-foreground hover:text-foreground transition-colors py-0.5"
          >
            View all →
          </button>
        )}
      </div>
    </div>
  );
};
