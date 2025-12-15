import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { LMVLogo } from '@/components/ui/lmv-logo';
import { haptics } from '@/lib/haptics';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus,
  Clock,
  BookOpen,
  Brain,
  CheckCircle2,
  Circle,
  Upload,
  X
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

const taskTypes = [
  { value: 'study', label: 'Study' },
  { value: 'recall', label: 'Active Recall' },
  { value: 'quiz', label: 'Quiz' },
  { value: 'reading', label: 'Reading' },
  { value: 'assignment', label: 'Assignment' },
];

const durationOptions = [15, 30, 45, 60, 90, 120];

const PlannerPage: React.FC = () => {
  const navigate = useNavigate();
  const [displayDate, setDisplayDate] = useState(new Date(currentDate));
  const [selectedDate, setSelectedDate] = useState(currentDate.toISOString().split('T')[0]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskTime, setNewTaskTime] = useState('09:00');
  const [newTaskDuration, setNewTaskDuration] = useState(30);
  const [newTaskType, setNewTaskType] = useState('study');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) loadTasks();
  }, [user, selectedDate]);

  const loadTasks = async () => {
    const { data } = await supabase
      .from('study_tasks')
      .select('*')
      .eq('scheduled_date', selectedDate)
      .order('scheduled_time');
    
    if (data) setTasks(data);
  };

  const toggleTask = async (taskId: string, completed: boolean) => {
    haptics.success();
    await supabase.from('study_tasks').update({ completed: !completed }).eq('id', taskId);
    loadTasks();
  };

  const addTask = async () => {
    if (!newTaskTitle.trim()) {
      toast({ title: "Please enter a task title", variant: "destructive" });
      return;
    }
    if (!user) {
      toast({ title: "Please sign in to add tasks", variant: "destructive" });
      return;
    }
    
    try {
      const { error } = await supabase.from('study_tasks').insert({
        user_id: user.id,
        title: newTaskTitle,
        description: newTaskDescription || null,
        scheduled_date: selectedDate,
        scheduled_time: newTaskTime,
        duration_minutes: newTaskDuration,
        task_type: newTaskType
      });

      if (error) {
        console.error('Error adding task:', error);
        toast({ title: "Failed to save task", description: error.message, variant: "destructive" });
        return;
      }

      haptics.success();
      setNewTaskTitle('');
      setNewTaskTime('09:00');
      setNewTaskDuration(30);
      setNewTaskType('study');
      setNewTaskDescription('');
      setShowAddTask(false);
      loadTasks();
      toast({ title: "Task added successfully" });
    } catch (err) {
      console.error('Unexpected error:', err);
      toast({ title: "Something went wrong", variant: "destructive" });
    }
  };

  const resetTaskForm = () => {
    setNewTaskTitle('');
    setNewTaskTime('09:00');
    setNewTaskDuration(30);
    setNewTaskType('study');
    setNewTaskDescription('');
    setShowAddTask(false);
  };

  const changeWeek = (direction: number) => {
    const newDate = new Date(displayDate);
    newDate.setDate(newDate.getDate() + (direction * 7));
    setDisplayDate(newDate);
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

  // Generate week days based on displayDate
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(displayDate);
    const dayOfWeek = displayDate.getDay();
    date.setDate(displayDate.getDate() - dayOfWeek + i);
    return {
      day: days[i],
      date: date.getDate(),
      fullDate: date.toISOString().split('T')[0],
      isToday: date.toDateString() === currentDate.toDateString(),
    };
  });

  return (
    <MobileLayout>
      <div className="py-6 safe-top">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <LMVLogo size="sm" variant="icon" />
          <h1 className="text-lg font-semibold text-foreground">Study Planner</h1>
          <button 
            onClick={() => setShowAddTask(true)}
            className="p-2 rounded-xl bg-primary text-primary-foreground"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-6">
          <button 
            onClick={() => changeWeek(-1)}
            className="p-2 rounded-xl hover:bg-secondary transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <div className="text-center">
            <h2 className="text-xl font-bold text-foreground">
              {displayDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h2>
            <p className="text-sm text-muted-foreground">Week {Math.ceil(displayDate.getDate() / 7)}</p>
          </div>
          <button 
            onClick={() => changeWeek(1)}
            className="p-2 rounded-xl hover:bg-secondary transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Week View */}
        <div className="flex justify-between mb-6">
          {weekDays.map((day) => (
            <button
              key={day.fullDate}
              onClick={() => setSelectedDate(day.fullDate)}
              className={cn(
                "flex flex-col items-center p-2 rounded-2xl transition-all min-w-[44px]",
                selectedDate === day.fullDate
                  ? "gradient-primary shadow-glow"
                  : day.isToday
                  ? "bg-primary/10"
                  : "hover:bg-secondary"
              )}
            >
              <span className={cn(
                "text-xs font-medium mb-1",
                selectedDate === day.fullDate
                  ? "text-primary-foreground"
                  : "text-muted-foreground"
              )}>
                {day.day}
              </span>
              <span className={cn(
                "text-lg font-bold",
                selectedDate === day.fullDate
                  ? "text-primary-foreground"
                  : "text-foreground"
              )}>
                {day.date}
              </span>
            </button>
          ))}
        </div>

        {/* Upload Timetable Card */}
        <button 
          onClick={() => navigate('/upload')}
          className="w-full bg-secondary rounded-2xl p-4 mb-6 border border-dashed border-primary/30 hover:bg-primary/5 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
              <Upload className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-medium text-foreground text-sm">Upload Your Timetable</p>
              <p className="text-xs text-muted-foreground">Import ICS file or add manually</p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </div>
        </button>

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
                
            {tasks.length === 0 && (
              <div className="text-center py-8">
                <Clock className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground text-sm">No tasks for this day</p>
                <button 
                  onClick={() => setShowAddTask(true)}
                  className="mt-2 text-primary text-sm font-medium"
                >
                  Add a task
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Add Task Modal */}
        {showAddTask && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-end">
            <div className="w-full bg-card rounded-t-3xl p-5 pb-8 shadow-premium max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground">Add New Task</h3>
                <button 
                  onClick={resetTaskForm}
                  className="p-2 rounded-xl hover:bg-secondary"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
              
              {/* Task Title */}
              <div className="mb-4">
                <label className="text-sm font-medium text-foreground mb-2 block">Task Title *</label>
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="e.g., Review Constitutional Law notes"
                  className="w-full px-4 py-3 rounded-2xl bg-secondary border border-border/50 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground placeholder:text-muted-foreground text-sm"
                  autoFocus
                />
              </div>

              {/* Time and Duration Row */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Time</label>
                  <input
                    type="time"
                    value={newTaskTime}
                    onChange={(e) => setNewTaskTime(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl bg-secondary border border-border/50 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Duration</label>
                  <select
                    value={newTaskDuration}
                    onChange={(e) => setNewTaskDuration(Number(e.target.value))}
                    className="w-full px-4 py-3 rounded-2xl bg-secondary border border-border/50 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground text-sm appearance-none"
                  >
                    {durationOptions.map(d => (
                      <option key={d} value={d}>{d} min</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Task Type */}
              <div className="mb-4">
                <label className="text-sm font-medium text-foreground mb-2 block">Task Type</label>
                <div className="flex flex-wrap gap-2">
                  {taskTypes.map(type => (
                    <button
                      key={type.value}
                      onClick={() => setNewTaskType(type.value)}
                      className={cn(
                        "px-4 py-2 rounded-xl text-sm font-medium transition-all",
                        newTaskType === type.value
                          ? "gradient-primary text-primary-foreground"
                          : "bg-secondary text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description (Optional) */}
              <div className="mb-6">
                <label className="text-sm font-medium text-foreground mb-2 block">Description (optional)</label>
                <textarea
                  value={newTaskDescription}
                  onChange={(e) => setNewTaskDescription(e.target.value)}
                  placeholder="Add more details about this task..."
                  rows={2}
                  className="w-full px-4 py-3 rounded-2xl bg-secondary border border-border/50 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground placeholder:text-muted-foreground text-sm resize-none"
                />
              </div>

              <button
                onClick={addTask}
                disabled={!newTaskTitle.trim()}
                className="w-full gradient-primary text-primary-foreground py-3 rounded-xl font-semibold text-sm disabled:opacity-50"
              >
                Add Task
              </button>
            </div>
          </div>
        )}
      </div>
    </MobileLayout>
  );
};

export default PlannerPage;