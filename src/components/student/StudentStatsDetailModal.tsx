import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Loader2, Flame, Clock, Target, BookOpen, Calendar } from 'lucide-react';
import { format } from 'date-fns';

export type StudentStatType = 'streak' | 'hours' | 'tasks' | 'cases' | null;

interface StudentStatsDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  statType: StudentStatType;
}

interface StudySession {
  id: string;
  title: string;
  started_at: string;
  duration_minutes: number;
  completed: boolean;
}

interface StudyTask {
  id: string;
  title: string;
  task_type: string | null;
  scheduled_date: string | null;
  completed: boolean;
}

interface CaseRead {
  id: string;
  title: string;
  subject: string;
  content_type: string;
  created_at: string;
}

export const StudentStatsDetailModal: React.FC<StudentStatsDetailModalProps> = ({
  open,
  onOpenChange,
  statType,
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [streakDays, setStreakDays] = useState<string[]>([]);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [tasks, setTasks] = useState<StudyTask[]>([]);
  const [cases, setCases] = useState<CaseRead[]>([]);

  useEffect(() => {
    if (open && statType && user) {
      loadData();
    }
  }, [open, statType, user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      switch (statType) {
        case 'streak':
          await loadStreakHistory();
          break;
        case 'hours':
          await loadStudySessions();
          break;
        case 'tasks':
          await loadCompletedTasks();
          break;
        case 'cases':
          await loadCasesRead();
          break;
      }
    } catch (error) {
      console.error('Error loading stat details:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStreakHistory = async () => {
    // Get study sessions from the last 30 days to show active days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data } = await supabase
      .from('study_sessions')
      .select('started_at')
      .eq('user_id', user!.id)
      .gte('started_at', thirtyDaysAgo.toISOString())
      .order('started_at', { ascending: false });

    if (data) {
      const uniqueDays = [...new Set(data.map(s => 
        format(new Date(s.started_at), 'yyyy-MM-dd')
      ))];
      setStreakDays(uniqueDays);
    }
  };

  const loadStudySessions = async () => {
    const { data } = await supabase
      .from('study_sessions')
      .select('id, title, started_at, duration_minutes, completed')
      .eq('user_id', user!.id)
      .order('started_at', { ascending: false })
      .limit(30);

    if (data) {
      setSessions(data.map(s => ({
        ...s,
        completed: s.completed ?? false,
      })));
    }
  };

  const loadCompletedTasks = async () => {
    const { data } = await supabase
      .from('study_tasks')
      .select('id, title, task_type, scheduled_date, completed')
      .eq('user_id', user!.id)
      .eq('completed', true)
      .order('scheduled_date', { ascending: false })
      .limit(30);

    if (data) {
      setTasks(data.map(t => ({
        ...t,
        completed: t.completed ?? false,
      })));
    }
  };

  const loadCasesRead = async () => {
    // Get library content the user has interacted with
    const { data } = await supabase
      .from('library_content')
      .select('id, title, subject, content_type, created_at')
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(30);

    if (data) {
      setCases(data);
    }
  };

  const getTitle = () => {
    switch (statType) {
      case 'streak': return 'Study Streak History';
      case 'hours': return 'Study Sessions';
      case 'tasks': return 'Completed Tasks';
      case 'cases': return 'Cases & Materials Read';
      default: return 'Details';
    }
  };

  const getIcon = () => {
    switch (statType) {
      case 'streak': return <Flame className="w-5 h-5 text-orange-500" />;
      case 'hours': return <Clock className="w-5 h-5 text-blue-500" />;
      case 'tasks': return <Target className="w-5 h-5 text-green-500" />;
      case 'cases': return <BookOpen className="w-5 h-5 text-purple-500" />;
      default: return null;
    }
  };

  const getTaskTypeLabel = (type: string | null) => {
    const types: Record<string, string> = {
      study: 'Study',
      revision: 'Revision',
      quiz: 'Quiz',
      reading: 'Reading',
      assignment: 'Assignment',
    };
    return types[type || 'study'] || 'Study';
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      );
    }

    switch (statType) {
      case 'streak':
        return streakDays.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Flame className="w-12 h-12 mx-auto mb-2 text-muted-foreground/50" />
            <p>Start studying to build your streak!</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground mb-4">
              Active study days in the last 30 days: <span className="font-bold text-primary">{streakDays.length}</span>
            </p>
            <div className="grid grid-cols-5 gap-2">
              {streakDays.map((day, idx) => (
                <div 
                  key={idx} 
                  className="flex flex-col items-center p-2 bg-orange-500/10 rounded-lg"
                >
                  <Flame className="w-4 h-4 text-orange-500 mb-1" />
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(day), 'MMM d')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        );

      case 'hours':
        return sessions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="w-12 h-12 mx-auto mb-2 text-muted-foreground/50" />
            <p>No study sessions recorded yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map(session => (
              <div key={session.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{session.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(session.started_at), 'MMM d, h:mm a')}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-primary">{session.duration_minutes}m</p>
                  {session.completed && (
                    <Badge variant="secondary" className="bg-green-500/10 text-green-500 text-xs">Done</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        );

      case 'tasks':
        return tasks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Target className="w-12 h-12 mx-auto mb-2 text-muted-foreground/50" />
            <p>No completed tasks yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map(task => (
              <div key={task.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <Target className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{task.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {getTaskTypeLabel(task.task_type)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant="secondary" className="bg-green-500/10 text-green-500 text-xs">Completed</Badge>
                  {task.scheduled_date && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(task.scheduled_date), 'MMM d')}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        );

      case 'cases':
        return cases.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <BookOpen className="w-12 h-12 mx-auto mb-2 text-muted-foreground/50" />
            <p>No cases read yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {cases.map(item => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="font-medium text-sm line-clamp-1">{item.title}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {item.content_type} · {item.subject}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(item.created_at), 'MMM d')}
                </p>
              </div>
            ))}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getIcon()}
            {getTitle()}
          </DialogTitle>
          <DialogDescription>
            View details of your study progress
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          {renderContent()}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
