import React, { useState, useEffect } from 'react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { LMVLogo } from '@/components/ui/lmv-logo';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus,
  Clock,
  BookOpen,
  Brain,
  CheckCircle2,
  Circle,
  Upload
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const currentDate = new Date();

interface Task {
  id: string;
  title: string;
  scheduled_time: string | null;
  duration_minutes: number | null;
  task_type: string | null;
  completed: boolean | null;
}

const PlannerPage: React.FC = () => {
  const [selectedDay, setSelectedDay] = useState(currentDate.getDate());
  const [tasks, setTasks] = useState<Task[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) loadTasks();
  }, [user, selectedDay]);

  const loadTasks = async () => {
    const selectedDate = new Date(currentDate);
    selectedDate.setDate(selectedDay);
    
    const { data } = await supabase
      .from('study_tasks')
      .select('*')
      .eq('scheduled_date', selectedDate.toISOString().split('T')[0])
      .order('scheduled_time');
    
    if (data) setTasks(data);
  };

  const toggleTask = async (taskId: string, completed: boolean) => {
    await supabase.from('study_tasks').update({ completed: !completed }).eq('id', taskId);
    loadTasks();
  };

  const getTaskIcon = (type: string) => {
    switch (type) {
      case 'study': return BookOpen;
      case 'recall': return Brain;
      case 'quiz': return CheckCircle2;
      default: return Clock;
    }
  };

  const getTaskColor = (type: string) => {
    switch (type) {
      case 'study': return 'bg-primary/10 text-primary';
      case 'recall': return 'bg-warning/10 text-warning';
      case 'quiz': return 'bg-success/10 text-success';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  // Generate week days
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(currentDate);
    date.setDate(currentDate.getDate() - currentDate.getDay() + i);
    return {
      day: days[i],
      date: date.getDate(),
      isToday: date.toDateString() === currentDate.toDateString(),
    };
  });

  return (
    <MobileLayout>
      <div className="px-5 py-6 safe-top">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <LMVLogo size="sm" variant="icon" />
          <h1 className="text-lg font-semibold text-foreground">Study Planner</h1>
          <button className="p-2 rounded-xl bg-primary text-primary-foreground">
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-6">
          <button className="p-2 rounded-xl hover:bg-secondary transition-colors">
            <ChevronLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <div className="text-center">
            <h2 className="text-xl font-bold text-foreground">
              {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h2>
            <p className="text-sm text-muted-foreground">Week {Math.ceil(currentDate.getDate() / 7)}</p>
          </div>
          <button className="p-2 rounded-xl hover:bg-secondary transition-colors">
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Week View */}
        <div className="flex justify-between mb-6">
          {weekDays.map((day) => (
            <button
              key={day.date}
              onClick={() => setSelectedDay(day.date)}
              className={cn(
                "flex flex-col items-center p-2 rounded-2xl transition-all min-w-[44px]",
                selectedDay === day.date
                  ? "gradient-primary shadow-glow"
                  : day.isToday
                  ? "bg-primary/10"
                  : "hover:bg-secondary"
              )}
            >
              <span className={cn(
                "text-xs font-medium mb-1",
                selectedDay === day.date
                  ? "text-primary-foreground"
                  : "text-muted-foreground"
              )}>
                {day.day}
              </span>
              <span className={cn(
                "text-lg font-bold",
                selectedDay === day.date
                  ? "text-primary-foreground"
                  : "text-foreground"
              )}>
                {day.date}
              </span>
            </button>
          ))}
        </div>

        {/* Upload Timetable Card */}
        <div className="bg-secondary rounded-2xl p-4 mb-6 border border-dashed border-primary/30">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
              <Upload className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-foreground text-sm">Upload Your Timetable</p>
              <p className="text-xs text-muted-foreground">Import ICS file or add manually</p>
            </div>
          </div>
        </div>

        {/* Today's Tasks */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">Today's Tasks</h3>
            <span className="text-sm text-muted-foreground">
              {tasks.filter(t => t.completed).length}/{tasks.length} done
            </span>
          </div>

          <div className="space-y-3">
                {tasks.map((task) => {
                  const Icon = getTaskIcon(task.task_type || 'study');
                  return (
                    <div
                      key={task.id}
                      className={cn(
                        "bg-card rounded-2xl p-4 border shadow-card transition-all",
                        task.completed 
                          ? "border-success/30 opacity-60" 
                          : "border-border/50"
                      )}
                    >
                      <div className="flex items-start gap-4">
                        <button className="mt-0.5" onClick={() => toggleTask(task.id, task.completed || false)}>
                          {task.completed ? (
                            <CheckCircle2 className="w-5 h-5 text-success" />
                          ) : (
                            <Circle className="w-5 h-5 text-muted-foreground" />
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            "font-medium text-sm mb-1",
                            task.completed && "line-through text-muted-foreground"
                          )}>
                            {task.title}
                          </p>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {task.scheduled_time || '--:--'}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {task.duration_minutes || 30} min
                            </span>
                          </div>
                        </div>
                        <div className={cn("p-2 rounded-xl", getTaskColor(task.task_type || 'study'))}>
                          <Icon className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  );
                })}
          </div>
        </div>
      </div>
    </MobileLayout>
  );
};

export default PlannerPage;