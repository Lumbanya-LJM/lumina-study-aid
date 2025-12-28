import React from 'react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { ArrowLeft, TrendingUp, TrendingDown, Minus, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { StudyHeatmap, SubjectMasteryList, WeeklyComparison } from '@/components/premium/StudyHeatmap';
import { useStudyHeatmapData } from '@/hooks/useStudyHeatmapData';
import { cn } from '@/lib/utils';

const StudyAnalyticsPage: React.FC = () => {
  const navigate = useNavigate();
  const { heatmapData, subjectMastery, weeklyStats, isLoading } = useStudyHeatmapData();

  // Transform data for the components
  const heatmapStudyData = heatmapData.map(day => ({
    date: new Date(day.date),
    hours: day.count / 60, // Convert minutes to hours
    sessions: day.count > 0 ? 1 : 0,
  }));

  const subjectData = subjectMastery.map(s => ({
    subject: s.subject,
    mastery: s.progress,
    trend: s.quizAverage > 70 ? 'up' as const : s.quizAverage < 50 ? 'down' as const : 'stable' as const,
    sessionsThisWeek: 0,
  }));

  const weeklyComparisonData = [
    { label: 'Study Hours', thisWeek: weeklyStats.thisWeek, lastWeek: weeklyStats.lastWeek },
  ];

  return (
    <MobileLayout>
      <div className="py-6 safe-top pb-24">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl hover:bg-secondary transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-xl font-bold text-foreground">Study Analytics</h1>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Weekly Summary Card */}
            <div className="bg-card rounded-2xl p-5 border border-border/50 shadow-card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground">This Week</h2>
                <div className={cn(
                  'flex items-center gap-1 text-sm font-medium',
                  weeklyStats.percentChange > 0 && 'text-emerald-500',
                  weeklyStats.percentChange < 0 && 'text-red-500',
                  weeklyStats.percentChange === 0 && 'text-muted-foreground'
                )}>
                  {weeklyStats.percentChange > 0 && <TrendingUp className="w-4 h-4" />}
                  {weeklyStats.percentChange < 0 && <TrendingDown className="w-4 h-4" />}
                  {weeklyStats.percentChange === 0 && <Minus className="w-4 h-4" />}
                  <span>{Math.abs(weeklyStats.percentChange)}% vs last week</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-primary/5 rounded-xl p-4">
                  <p className="text-2xl font-bold text-primary">{weeklyStats.thisWeek}h</p>
                  <p className="text-xs text-muted-foreground">This week</p>
                </div>
                <div className="bg-muted/50 rounded-xl p-4">
                  <p className="text-2xl font-bold text-muted-foreground">{weeklyStats.lastWeek}h</p>
                  <p className="text-xs text-muted-foreground">Last week</p>
                </div>
              </div>
            </div>

            {/* Study Heatmap */}
            <div className="bg-card rounded-2xl p-5 border border-border/50 shadow-card">
              <h2 className="text-lg font-semibold text-foreground mb-4">Study Activity</h2>
              <StudyHeatmap data={heatmapStudyData} weeks={16} />
            </div>

            {/* Subject Mastery */}
            {subjectData.length > 0 && (
              <div className="bg-card rounded-2xl p-5 border border-border/50 shadow-card">
                <h2 className="text-lg font-semibold text-foreground mb-4">Subject Mastery</h2>
                <SubjectMasteryList subjects={subjectData} />
              </div>
            )}

            {/* Weekly Comparison */}
            <div className="bg-card rounded-2xl p-5 border border-border/50 shadow-card">
              <h2 className="text-lg font-semibold text-foreground mb-4">Weekly Comparison</h2>
              <WeeklyComparison stats={weeklyComparisonData} />
            </div>
          </div>
        )}
      </div>
    </MobileLayout>
  );
};

export default StudyAnalyticsPage;
