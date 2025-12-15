import React from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';
import { haptics } from '@/lib/haptics';

export interface QuickActionProps {
  icon: LucideIcon;
  label: string;
  description?: string;
  onClick?: () => void;
  className?: string;
  variant?: 'default' | 'gradient';
}

export const QuickAction: React.FC<QuickActionProps> = ({
  icon: Icon,
  label,
  description,
  onClick,
  className,
  variant = 'default',
}) => {
  const handleClick = () => {
    haptics.light();
    onClick?.();
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        "flex items-center gap-3 p-4 rounded-2xl transition-all duration-300 w-full text-left active:scale-[0.98]",
        variant === 'gradient' 
          ? "gradient-primary text-primary-foreground shadow-glow hover:scale-[1.02] animate-glow-pulse"
          : "bg-card border border-border/50 shadow-card hover:shadow-premium hover:border-primary/20 hover:scale-[1.02]",
        className
      )}
    >
      <div className={cn(
        "p-3 rounded-xl",
        variant === 'gradient' 
          ? "bg-primary-foreground/20" 
          : "bg-primary/10"
      )}>
        <Icon className={cn(
          "w-5 h-5",
          variant === 'gradient' ? "text-primary-foreground" : "text-primary"
        )} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn(
          "font-semibold text-sm truncate",
          variant === 'gradient' ? "text-primary-foreground" : "text-foreground"
        )}>
          {label}
        </p>
        {description && (
          <p className={cn(
            "text-xs truncate mt-0.5",
            variant === 'gradient' ? "text-primary-foreground/80" : "text-muted-foreground"
          )}>
            {description}
          </p>
        )}
      </div>
    </button>
  );
};