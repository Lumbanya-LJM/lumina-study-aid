import React from 'react';
import { cn } from '@/lib/utils';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'default' | 'subtle' | 'strong' | 'glow';
  hover?: boolean;
  animate?: boolean;
}

export const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, children, variant = 'default', hover = true, animate = false, ...props }, ref) => {
    const variants = {
      default: 'bg-card/80 backdrop-blur-xl border-border/50',
      subtle: 'bg-card/60 backdrop-blur-lg border-border/30',
      strong: 'bg-card/95 backdrop-blur-2xl border-border/70',
      glow: 'bg-card/80 backdrop-blur-xl border-primary/30 shadow-glow',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'rounded-2xl border shadow-lg transition-all duration-300',
          variants[variant],
          hover && 'hover:shadow-xl hover:scale-[1.01] hover:border-primary/40',
          animate && 'animate-fade-in-up',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

GlassCard.displayName = 'GlassCard';

// Shimmer loading skeleton with glassmorphism
export const GlassShimmer: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl bg-muted/50 backdrop-blur-sm',
        className
      )}
    >
      <div
        className="absolute inset-0 -translate-x-full animate-shimmer"
        style={{
          background: 'linear-gradient(90deg, transparent, hsl(var(--primary) / 0.1), transparent)',
          backgroundSize: '200% 100%',
        }}
      />
    </div>
  );
};

// Animated progress ring
interface ProgressRingProps {
  progress: number; // 0-100
  size?: number;
  strokeWidth?: number;
  className?: string;
  showLabel?: boolean;
  color?: 'primary' | 'success' | 'warning';
}

export const ProgressRing: React.FC<ProgressRingProps> = ({
  progress,
  size = 60,
  strokeWidth = 4,
  className,
  showLabel = true,
  color = 'primary',
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const colorClasses = {
    primary: 'text-primary',
    success: 'text-success',
    warning: 'text-warning',
  };

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/30"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className={cn('transition-all duration-500 ease-out', colorClasses[color])}
        />
      </svg>
      {showLabel && (
        <span className="absolute text-xs font-semibold text-foreground">
          {Math.round(progress)}%
        </span>
      )}
    </div>
  );
};

// Animated badge with glow effect
interface AnimatedBadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'glow';
  pulse?: boolean;
  className?: string;
}

export const AnimatedBadge: React.FC<AnimatedBadgeProps> = ({
  children,
  variant = 'default',
  pulse = false,
  className,
}) => {
  const variants = {
    default: 'bg-primary/10 text-primary border-primary/20',
    success: 'bg-success/10 text-success border-success/20',
    warning: 'bg-warning/10 text-warning border-warning/20',
    glow: 'bg-primary/20 text-primary border-primary/40 shadow-glow animate-glow-pulse',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all',
        variants[variant],
        pulse && 'animate-pulse-ring',
        className
      )}
    >
      {children}
    </span>
  );
};
