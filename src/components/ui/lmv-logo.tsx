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
    sm: { container: 'w-10 h-10', icon: 'w-8 h-8', text: 'text-lg' },
    md: { container: 'w-14 h-14', icon: 'w-11 h-11', text: 'text-xl' },
    lg: { container: 'w-20 h-20', icon: 'w-16 h-16', text: 'text-2xl' },
    xl: { container: 'w-32 h-32', icon: 'w-28 h-28', text: 'text-4xl' },
  };

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {/* Clean circular container with white background to hide logo artifacts */}
      <div 
        className={cn(
          "relative flex items-center justify-center rounded-xl bg-white shadow-sm border border-border/30",
          sizes[size].container
        )}
      >
        <img 
          src={lmvLogo} 
          alt="Luminary Innovision Academy" 
          className={cn("object-contain", sizes[size].icon)}
        />
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