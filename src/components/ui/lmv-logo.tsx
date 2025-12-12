import React from 'react';
import { cn } from '@/lib/utils';

interface LMVLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'full' | 'icon';
}

export const LMVLogo: React.FC<LMVLogoProps> = ({ 
  className, 
  size = 'md',
  variant = 'full' 
}) => {
  const sizes = {
    sm: { icon: 'w-8 h-8', text: 'text-lg' },
    md: { icon: 'w-12 h-12', text: 'text-xl' },
    lg: { icon: 'w-16 h-16', text: 'text-2xl' },
    xl: { icon: 'w-24 h-24', text: 'text-4xl' },
  };

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className={cn(
        "gradient-primary rounded-2xl flex items-center justify-center shadow-glow",
        sizes[size].icon
      )}>
        <span className="font-display font-bold text-primary-foreground" style={{ fontSize: size === 'xl' ? '1.5rem' : size === 'lg' ? '1rem' : '0.75rem' }}>
          LMV
        </span>
      </div>
      {variant === 'full' && (
        <div className="flex flex-col">
          <span className={cn("font-display font-semibold text-foreground leading-tight", sizes[size].text)}>
            Luminary
          </span>
          <span className="text-xs text-muted-foreground font-medium tracking-wider uppercase">
            Innovision Academy
          </span>
        </div>
      )}
    </div>
  );
};