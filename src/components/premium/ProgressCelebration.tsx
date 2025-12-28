import React from 'react';
import { createPortal } from 'react-dom';
import { Trophy, Star, Flame, Target, BookOpen, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';

interface CelebrationProps {
  type: 'streak' | 'milestone' | 'completion' | 'achievement';
  title: string;
  subtitle?: string;
  onComplete?: () => void;
}

const celebrationConfig = {
  streak: { icon: Flame, color: 'text-orange-500', bg: 'bg-orange-500/20' },
  milestone: { icon: Star, color: 'text-yellow-500', bg: 'bg-yellow-500/20' },
  completion: { icon: Target, color: 'text-green-500', bg: 'bg-green-500/20' },
  achievement: { icon: Trophy, color: 'text-primary', bg: 'bg-primary/20' },
};

export const ProgressCelebration: React.FC<CelebrationProps & { active: boolean }> = ({
  active,
  type,
  title,
  subtitle,
  onComplete,
}) => {
  const [isVisible, setIsVisible] = React.useState(false);
  const config = celebrationConfig[type];
  const Icon = config.icon;

  React.useEffect(() => {
    if (active) {
      haptics.success();
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        onComplete?.();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [active, onComplete]);

  if (!isVisible) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm animate-fade-in" />
      
      {/* Celebration Card */}
      <div className="relative animate-scale-bounce">
        <div className="bg-card border border-border/50 rounded-3xl p-8 shadow-2xl text-center max-w-sm mx-4">
          {/* Animated rings */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className={cn('w-32 h-32 rounded-full animate-pulse-ring', config.bg)} />
          </div>
          
          {/* Icon */}
          <div className={cn('relative mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-4 animate-celebrate', config.bg)}>
            <Icon className={cn('w-10 h-10', config.color)} />
          </div>
          
          {/* Content */}
          <h3 className="text-xl font-bold text-foreground mb-1">{title}</h3>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
          
          {/* Sparkles */}
          <div className="absolute top-4 left-4 animate-float">
            <Zap className="w-4 h-4 text-yellow-500" />
          </div>
          <div className="absolute top-8 right-6 animate-float" style={{ animationDelay: '0.2s' }}>
            <Star className="w-3 h-3 text-primary" />
          </div>
          <div className="absolute bottom-8 left-8 animate-float" style={{ animationDelay: '0.4s' }}>
            <Star className="w-4 h-4 text-yellow-500" />
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

// Hook to trigger celebrations
import { create } from 'zustand';

interface CelebrationState {
  active: boolean;
  type: 'streak' | 'milestone' | 'completion' | 'achievement';
  title: string;
  subtitle?: string;
  celebrate: (props: Omit<CelebrationProps, 'onComplete'>) => void;
  hide: () => void;
}

export const useCelebration = create<CelebrationState>((set) => ({
  active: false,
  type: 'achievement',
  title: '',
  subtitle: undefined,
  celebrate: ({ type, title, subtitle }) => set({ active: true, type, title, subtitle }),
  hide: () => set({ active: false }),
}));

// Global celebration component
export const CelebrationProvider: React.FC = () => {
  const { active, type, title, subtitle, hide } = useCelebration();
  
  return (
    <ProgressCelebration
      active={active}
      type={type}
      title={title}
      subtitle={subtitle}
      onComplete={hide}
    />
  );
};

export default ProgressCelebration;
