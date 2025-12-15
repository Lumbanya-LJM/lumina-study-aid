import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useStudyReminders } from '@/hooks/useStudyReminders';
import { haptics } from '@/lib/haptics';
import { 
  Brain, 
  Clock, 
  Flame, 
  X, 
  ChevronRight,
  Sparkles 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { LuminaAvatar } from './LuminaAvatar';

export const StudyRemindersCard: React.FC = () => {
  const navigate = useNavigate();
  const { reminders, dismissReminder, hasReminders } = useStudyReminders();

  if (!hasReminders) return null;

  const getIcon = (type: string) => {
    switch (type) {
      case 'flashcard_review': return Brain;
      case 'upcoming_task': return Clock;
      case 'streak_reminder': return Flame;
      default: return Sparkles;
    }
  };

  const getPriorityStyles = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-warning/50 bg-warning/5';
      case 'medium': return 'border-primary/30 bg-primary/5';
      default: return 'border-border/50 bg-card';
    }
  };

  const handleReminderClick = (actionUrl?: string) => {
    haptics.medium();
    if (actionUrl) {
      navigate(actionUrl);
    }
  };

  const handleDismiss = (e: React.MouseEvent, reminderId: string) => {
    e.stopPropagation();
    haptics.light();
    dismissReminder(reminderId);
  };

  return (
    <div className="mb-6 animate-fade-in-up">
      {/* Header with Lumina */}
      <div className="flex items-center gap-3 mb-3">
        <LuminaAvatar size="sm" />
        <div>
          <p className="text-sm font-medium text-foreground">Lumina's Reminders</p>
          <p className="text-xs text-muted-foreground">Personalized study suggestions</p>
        </div>
      </div>

      {/* Reminders List */}
      <div className="space-y-2">
        {reminders.slice(0, 3).map((reminder, index) => {
          const Icon = getIcon(reminder.type);
          return (
            <button
              key={reminder.id}
              onClick={() => handleReminderClick(reminder.actionUrl)}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-2xl border transition-all",
                "hover:shadow-card active:scale-[0.98]",
                getPriorityStyles(reminder.priority),
                "animate-fade-in-up"
              )}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                reminder.priority === 'high' 
                  ? "bg-warning/20 text-warning" 
                  : "bg-primary/20 text-primary"
              )}>
                <Icon className="w-5 h-5" />
              </div>
              
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {reminder.title}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {reminder.message}
                </p>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                <button
                  onClick={(e) => handleDismiss(e, reminder.id)}
                  className="p-1 rounded-lg hover:bg-secondary/80 transition-colors"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
