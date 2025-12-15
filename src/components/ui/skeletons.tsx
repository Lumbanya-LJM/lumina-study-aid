import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export const HomePageSkeleton: React.FC = () => {
  return (
    <div className="px-5 py-6 safe-top animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-xl" />
          <div className="space-y-1">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-2 w-12" />
          </div>
        </div>
        <Skeleton className="w-9 h-9 rounded-xl" />
      </div>

      {/* Greeting Card */}
      <Skeleton className="h-32 rounded-3xl mb-6" />

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mb-6">
        <Skeleton className="h-6 w-28 mb-3" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      </div>

      {/* Today's Schedule */}
      <div className="mb-6">
        <div className="flex justify-between mb-3">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-5 w-16" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
};

export const ChatMessageSkeleton: React.FC = () => {
  return (
    <div className="space-y-4 animate-fade-in">
      {/* Lumina message */}
      <div className="flex justify-start">
        <Skeleton className="h-16 w-[75%] rounded-2xl rounded-bl-sm" />
      </div>
      {/* User message */}
      <div className="flex justify-end">
        <Skeleton className="h-10 w-[60%] rounded-2xl rounded-br-sm" />
      </div>
      {/* Lumina message */}
      <div className="flex justify-start">
        <Skeleton className="h-24 w-[80%] rounded-2xl rounded-bl-sm" />
      </div>
    </div>
  );
};

export const LibraryCardSkeleton: React.FC = () => {
  return (
    <div className="bg-card rounded-2xl p-4 border border-border/50 animate-fade-in">
      <div className="flex gap-4">
        <Skeleton className="w-12 h-12 rounded-xl shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
    </div>
  );
};

export const FlashcardDeckSkeleton: React.FC = () => {
  return (
    <div className="space-y-3 animate-fade-in">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-card rounded-2xl p-4 border border-border/50">
          <div className="flex items-center gap-4">
            <Skeleton className="w-14 h-14 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
            <Skeleton className="w-8 h-8 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
};

export const QuizCardSkeleton: React.FC = () => {
  return (
    <div className="space-y-3 animate-fade-in">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-card rounded-2xl p-4 border border-border/50">
          <div className="space-y-3">
            <div className="flex justify-between">
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-3 w-3/4" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export const ProfileSkeleton: React.FC = () => {
  return (
    <div className="px-5 py-6 safe-top animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Skeleton className="w-10 h-10 rounded-xl" />
        <Skeleton className="h-6 w-24" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 rounded-2xl" />
        ))}
      </div>

      {/* Profile Card */}
      <Skeleton className="h-32 rounded-3xl mb-6" />

      {/* Menu Items */}
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-16 rounded-2xl" />
        ))}
      </div>
    </div>
  );
};

export const AchievementsSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Points Card */}
      <Skeleton className="h-28 rounded-3xl" />

      {/* Category */}
      <div>
        <Skeleton className="h-4 w-24 mb-3" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card rounded-2xl p-4 border border-border/50">
              <div className="flex items-start gap-4">
                <Skeleton className="w-12 h-12 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="flex justify-between">
                    <Skeleton className="h-5 w-1/2" />
                    <Skeleton className="h-5 w-12 rounded-full" />
                  </div>
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-1.5 w-full rounded-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const AnalyticsSkeleton: React.FC = () => {
  return (
    <div className="px-5 py-6 safe-top animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Skeleton className="w-10 h-10 rounded-xl" />
        <Skeleton className="h-6 w-32" />
      </div>

      {/* Date Range */}
      <Skeleton className="h-10 w-48 rounded-xl mb-6" />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>

      {/* Chart */}
      <Skeleton className="h-64 rounded-2xl mb-6" />

      {/* Activity List */}
      <Skeleton className="h-6 w-32 mb-3" />
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 rounded-2xl" />
        ))}
      </div>
    </div>
  );
};
