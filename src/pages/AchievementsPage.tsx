import React from 'react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { useAchievements } from '@/hooks/useAchievements';
import { AchievementsSkeleton } from '@/components/ui/skeletons';
import { ArrowLeft, Trophy, Lock, Flame, Brain, BookOpen, Clock, Layers, PenLine } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

const iconMap: Record<string, React.ElementType> = {
  flame: Flame,
  brain: Brain,
  trophy: Trophy,
  'book-open': BookOpen,
  clock: Clock,
  layers: Layers,
  'pen-line': PenLine,
};

const categoryColors: Record<string, string> = {
  streak: 'from-orange-500 to-red-500',
  quiz: 'from-purple-500 to-pink-500',
  flashcards: 'from-blue-500 to-cyan-500',
  study: 'from-green-500 to-emerald-500',
  cases: 'from-amber-500 to-yellow-500',
  journal: 'from-indigo-500 to-violet-500',
};

const AchievementsPage: React.FC = () => {
  const navigate = useNavigate();
  const { achievements, earnedAchievements, totalPoints, isLoading, getProgress } = useAchievements();

  const earnedIds = new Set(earnedAchievements.map(ea => ea.achievement_id));

  // Group achievements by category
  const groupedAchievements = achievements.reduce((acc, achievement) => {
    const category = achievement.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(achievement);
    return acc;
  }, {} as Record<string, typeof achievements>);

  const categoryLabels: Record<string, string> = {
    streak: 'Study Streaks',
    quiz: 'Quizzes',
    flashcards: 'Flashcards',
    study: 'Study Hours',
    cases: 'Cases',
    journal: 'Journaling',
  };

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
          <h1 className="text-xl font-bold text-foreground">Achievements</h1>
        </div>

        {/* Points Summary */}
        <div className="gradient-primary rounded-3xl p-5 mb-6 shadow-glow">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary-foreground/20 flex items-center justify-center">
              <Trophy className="w-8 h-8 text-primary-foreground" />
            </div>
            <div>
              <p className="text-primary-foreground/80 text-sm">Total Points Earned</p>
              <p className="text-3xl font-bold text-primary-foreground">{totalPoints}</p>
              <p className="text-primary-foreground/70 text-xs">
                {earnedAchievements.length} of {achievements.length} achievements unlocked
              </p>
            </div>
          </div>
        </div>

        {isLoading ? (
          <AchievementsSkeleton />
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedAchievements).map(([category, categoryAchievements], categoryIndex) => (
              <div 
                key={category}
                className="animate-fade-in-up opacity-0"
                style={{ animationDelay: `${categoryIndex * 0.1}s`, animationFillMode: 'forwards' }}
              >
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  {categoryLabels[category] || category}
                </h2>
                <div className="space-y-3">
                  {categoryAchievements.map((achievement) => {
                    const isEarned = earnedIds.has(achievement.id);
                    const progress = getProgress(achievement);
                    const IconComponent = iconMap[achievement.icon] || Trophy;
                    const colorClass = categoryColors[category] || 'from-primary to-accent';

                    return (
                      <div
                        key={achievement.id}
                        className={cn(
                          'bg-card rounded-2xl p-4 border shadow-sm transition-all',
                          isEarned
                            ? 'border-primary/30'
                            : 'border-border/50 opacity-75'
                        )}
                      >
                        <div className="flex items-start gap-4">
                          <div
                            className={cn(
                              'w-12 h-12 rounded-xl flex items-center justify-center',
                              isEarned
                                ? `bg-gradient-to-br ${colorClass}`
                                : 'bg-muted'
                            )}
                          >
                            {isEarned ? (
                              <IconComponent className="w-6 h-6 text-white" />
                            ) : (
                              <Lock className="w-5 h-5 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <p className={cn(
                                'font-semibold truncate',
                                isEarned ? 'text-foreground' : 'text-muted-foreground'
                              )}>
                                {achievement.name}
                              </p>
                              <span className={cn(
                                'text-xs font-medium px-2 py-0.5 rounded-full',
                                isEarned
                                  ? 'bg-primary/10 text-primary'
                                  : 'bg-muted text-muted-foreground'
                              )}>
                                {achievement.points} pts
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mb-2">
                              {achievement.description}
                            </p>
                            {!isEarned && (
                              <div className="space-y-1">
                                <Progress value={progress.percentage} className="h-1.5" />
                                <p className="text-[10px] text-muted-foreground">
                                  {progress.current} / {progress.required}
                                </p>
                              </div>
                            )}
                            {isEarned && (
                              <p className="text-[10px] text-primary font-medium">
                                ✓ Unlocked
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </MobileLayout>
  );
};

export default AchievementsPage;
