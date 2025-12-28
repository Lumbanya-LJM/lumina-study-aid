import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { format, eachDayOfInterval, startOfWeek, endOfWeek, subWeeks, isSameDay } from 'date-fns';

interface StudyDay {
  date: Date;
  hours: number;
  sessions: number;
}

interface StudyHeatmapProps {
  data: StudyDay[];
  weeks?: number;
  className?: string;
}

const INTENSITY_COLORS = [
  'bg-muted/30',           // 0 hours
  'bg-primary/20',         // 0-1 hours
  'bg-primary/40',         // 1-2 hours
  'bg-primary/60',         // 2-3 hours
  'bg-primary/80',         // 3-4 hours
  'bg-primary',            // 4+ hours
];

export const StudyHeatmap: React.FC<StudyHeatmapProps> = ({
  data,
  weeks = 12,
  className,
}) => {
  const { calendar, weekDays, legend } = useMemo(() => {
    const today = new Date();
    const startDate = startOfWeek(subWeeks(today, weeks - 1), { weekStartsOn: 0 });
    const endDate = endOfWeek(today, { weekStartsOn: 0 });
    
    const allDays = eachDayOfInterval({ start: startDate, end: endDate });
    
    // Group days by week
    const weeksArray: Date[][] = [];
    let currentWeek: Date[] = [];
    
    allDays.forEach((day, index) => {
      currentWeek.push(day);
      if (currentWeek.length === 7) {
        weeksArray.push(currentWeek);
        currentWeek = [];
      }
    });
    
    if (currentWeek.length > 0) {
      weeksArray.push(currentWeek);
    }

    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    const legend = [
      { label: 'Less', intensity: 0 },
      { label: '', intensity: 1 },
      { label: '', intensity: 2 },
      { label: '', intensity: 3 },
      { label: '', intensity: 4 },
      { label: 'More', intensity: 5 },
    ];

    return { calendar: weeksArray, weekDays, legend };
  }, [weeks]);

  const getIntensity = (date: Date): number => {
    const dayData = data.find((d) => isSameDay(d.date, date));
    if (!dayData || dayData.hours === 0) return 0;
    if (dayData.hours < 1) return 1;
    if (dayData.hours < 2) return 2;
    if (dayData.hours < 3) return 3;
    if (dayData.hours < 4) return 4;
    return 5;
  };

  const getTooltip = (date: Date): string => {
    const dayData = data.find((d) => isSameDay(d.date, date));
    const dateStr = format(date, 'MMM d, yyyy');
    if (!dayData || dayData.hours === 0) {
      return `${dateStr}: No study activity`;
    }
    return `${dateStr}: ${dayData.hours.toFixed(1)}h studied, ${dayData.sessions} session${dayData.sessions !== 1 ? 's' : ''}`;
  };

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex gap-1">
        {/* Week day labels */}
        <div className="flex flex-col gap-0.5 pr-2">
          {['', 'Mon', '', 'Wed', '', 'Fri', ''].map((day, i) => (
            <div key={i} className="h-3 text-[10px] text-muted-foreground flex items-center justify-end">
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar grid */}
        <div className="flex gap-0.5 overflow-x-auto no-scrollbar">
          {calendar.map((week, weekIndex) => (
            <div key={weekIndex} className="flex flex-col gap-0.5">
              {week.map((day, dayIndex) => {
                const intensity = getIntensity(day);
                const isToday = isSameDay(day, new Date());
                
                return (
                  <div
                    key={dayIndex}
                    className={cn(
                      'w-3 h-3 rounded-sm transition-all cursor-pointer hover:ring-2 hover:ring-primary/50',
                      INTENSITY_COLORS[intensity],
                      isToday && 'ring-2 ring-primary'
                    )}
                    title={getTooltip(day)}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>{legend[0].label}</span>
        <div className="flex gap-0.5">
          {legend.map((item, index) => (
            <div
              key={index}
              className={cn('w-3 h-3 rounded-sm', INTENSITY_COLORS[item.intensity])}
            />
          ))}
        </div>
        <span>{legend[legend.length - 1].label}</span>
      </div>
    </div>
  );
};

// Subject mastery component
interface SubjectMastery {
  subject: string;
  mastery: number; // 0-100
  trend: 'up' | 'down' | 'stable';
  sessionsThisWeek: number;
}

interface SubjectMasteryListProps {
  subjects: SubjectMastery[];
  className?: string;
}

export const SubjectMasteryList: React.FC<SubjectMasteryListProps> = ({
  subjects,
  className,
}) => {
  return (
    <div className={cn('space-y-3', className)}>
      {subjects.map((subject) => (
        <div key={subject.subject} className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">{subject.subject}</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {subject.sessionsThisWeek} sessions
              </span>
              <span
                className={cn(
                  'text-xs font-medium',
                  subject.trend === 'up' && 'text-success',
                  subject.trend === 'down' && 'text-destructive',
                  subject.trend === 'stable' && 'text-muted-foreground'
                )}
              >
                {subject.trend === 'up' ? '↑' : subject.trend === 'down' ? '↓' : '–'}
              </span>
            </div>
          </div>
          <div className="relative h-2 bg-muted/50 rounded-full overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all duration-500"
              style={{ width: `${subject.mastery}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Beginner</span>
            <span>{subject.mastery}% mastery</span>
            <span>Expert</span>
          </div>
        </div>
      ))}
    </div>
  );
};

// Weekly comparison chart
interface WeeklyStats {
  label: string;
  thisWeek: number;
  lastWeek: number;
}

interface WeeklyComparisonProps {
  stats: WeeklyStats[];
  className?: string;
}

export const WeeklyComparison: React.FC<WeeklyComparisonProps> = ({
  stats,
  className,
}) => {
  const maxValue = Math.max(...stats.flatMap((s) => [s.thisWeek, s.lastWeek]), 1);

  return (
    <div className={cn('space-y-4', className)}>
      {stats.map((stat) => (
        <div key={stat.label} className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-foreground">{stat.label}</span>
            <div className="flex items-center gap-3 text-xs">
              <span className="text-primary">This week: {stat.thisWeek}</span>
              <span className="text-muted-foreground">Last week: {stat.lastWeek}</span>
            </div>
          </div>
          <div className="flex gap-1 h-4">
            <div
              className="bg-primary rounded transition-all duration-500"
              style={{ width: `${(stat.thisWeek / maxValue) * 100}%` }}
            />
            <div
              className="bg-muted-foreground/30 rounded transition-all duration-500"
              style={{ width: `${(stat.lastWeek / maxValue) * 100}%` }}
            />
          </div>
        </div>
      ))}
      
      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-primary" />
          <span>This week</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-muted-foreground/30" />
          <span>Last week</span>
        </div>
      </div>
    </div>
  );
};
