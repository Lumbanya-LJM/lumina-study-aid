import React from 'react';
import { Flame, Clock, Target, BookOpen, Calendar, TrendingUp, Award } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WeeklyProgressReportProps {
  studentName: string;
  university?: string;
  yearOfStudy?: number;
  weekStartDate: string;
  weekEndDate: string;
  stats: {
    streakDays: number;
    studyHours: number;
    tasksCompleted: number;
    totalTasks: number;
    casesRead: number;
    quizzesCompleted: number;
    flashcardsReviewed: number;
  };
  className?: string;
}

export const WeeklyProgressReport: React.FC<WeeklyProgressReportProps> = ({
  studentName,
  university,
  yearOfStudy,
  weekStartDate,
  weekEndDate,
  stats,
  className,
}) => {
  const completionRate = stats.totalTasks > 0 
    ? Math.round((stats.tasksCompleted / stats.totalTasks) * 100) 
    : 0;

  const statItems = [
    { icon: Flame, label: 'Study Streak', value: `${stats.streakDays} days`, color: 'text-orange-500' },
    { icon: Clock, label: 'Study Hours', value: `${stats.studyHours.toFixed(1)} hrs`, color: 'text-blue-500' },
    { icon: Target, label: 'Tasks Completed', value: `${stats.tasksCompleted}/${stats.totalTasks}`, color: 'text-green-500' },
    { icon: BookOpen, label: 'Materials Reviewed', value: stats.casesRead.toString(), color: 'text-purple-500' },
    { icon: Award, label: 'Quizzes Done', value: stats.quizzesCompleted.toString(), color: 'text-primary' },
    { icon: TrendingUp, label: 'Cards Reviewed', value: stats.flashcardsReviewed.toString(), color: 'text-cyan-500' },
  ];

  return (
    <div className={cn("bg-card rounded-2xl border border-border/50 shadow-card overflow-hidden", className)}>
      {/* Header */}
      <div className="gradient-primary p-5 text-center">
        <h2 className="text-lg font-bold text-primary-foreground mb-1">Weekly Progress Report</h2>
        <p className="text-sm text-primary-foreground/80">
          <Calendar className="w-4 h-4 inline mr-1" />
          {weekStartDate} - {weekEndDate}
        </p>
      </div>

      {/* Student Info */}
      <div className="p-5 border-b border-border/50 bg-secondary/30">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center text-primary-foreground font-bold text-lg">
            {studentName.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>
          <div>
            <p className="font-semibold text-foreground">{studentName}</p>
            <p className="text-xs text-muted-foreground">
              {university || 'Law Student'}
              {yearOfStudy && ` · Year ${yearOfStudy}`}
            </p>
          </div>
        </div>
      </div>

      {/* Completion Badge */}
      <div className="p-5 text-center border-b border-border/50">
        <div className="relative inline-flex items-center justify-center w-24 h-24">
          <svg className="w-24 h-24 transform -rotate-90">
            <circle
              cx="48"
              cy="48"
              r="40"
              fill="none"
              stroke="hsl(var(--secondary))"
              strokeWidth="8"
            />
            <circle
              cx="48"
              cy="48"
              r="40"
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="8"
              strokeDasharray={`${completionRate * 2.51} 251`}
              className="transition-all duration-500"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-foreground">{completionRate}%</span>
            <span className="text-[10px] text-muted-foreground">Completed</span>
          </div>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">Weekly Goal Progress</p>
      </div>

      {/* Stats Grid */}
      <div className="p-5">
        <div className="grid grid-cols-2 gap-3">
          {statItems.map((stat, index) => (
            <div key={index} className="bg-secondary rounded-xl p-3 flex items-center gap-3">
              <div className={cn("p-2 rounded-lg bg-background", stat.color)}>
                <stat.icon className="w-4 h-4" />
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm">{stat.value}</p>
                <p className="text-[10px] text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-3 bg-primary/5 border-t border-border/50 text-center">
        <p className="text-xs text-muted-foreground">
          Powered by Luminary Innovision Academy — Law • Business • Health
        </p>
      </div>
    </div>
  );
};
