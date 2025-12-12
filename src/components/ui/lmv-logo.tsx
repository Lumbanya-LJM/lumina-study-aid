import React from 'react';
import { cn } from '@/lib/utils';
import lmvLogo from '@/assets/lmv-logo.png';

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
    sm: { icon: 'w-10 h-10', text: 'text-lg' },
    md: { icon: 'w-14 h-14', text: 'text-xl' },
    lg: { icon: 'w-20 h-20', text: 'text-2xl' },
    xl: { icon: 'w-32 h-32', text: 'text-4xl' },
  };

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <img 
        src={lmvLogo} 
        alt="Luminary Innovision Academy" 
        className={cn("object-contain", sizes[size].icon)}
      />
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