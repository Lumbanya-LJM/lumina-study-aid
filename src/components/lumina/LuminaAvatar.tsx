import React from 'react';
import { cn } from '@/lib/utils';
import luminaAvatar from '@/assets/lumina-avatar.png';

interface LuminaAvatarProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  isActive?: boolean;
}

export const LuminaAvatar: React.FC<LuminaAvatarProps> = ({
  size = 'md',
  className,
  isActive = false,
}) => {
  const sizes = {
    sm: 'w-10 h-10',
    md: 'w-14 h-14',
    lg: 'w-20 h-20',
    xl: 'w-32 h-32',
  };

  return (
    <div className={cn("relative", className)}>
      {isActive && (
        <div className={cn(
          "absolute inset-0 rounded-full gradient-primary animate-pulse-ring opacity-50",
          sizes[size]
        )} />
      )}
      <div className={cn(
        "rounded-full overflow-hidden border-2 border-primary/20 shadow-card relative bg-secondary",
        sizes[size],
        isActive && "border-primary shadow-glow"
      )}>
        <img
          src={luminaAvatar}
          alt="Lumina - Your AI Study Buddy"
          className="w-full h-full object-cover"
        />
      </div>
      {isActive && (
        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-success rounded-full border-2 border-background" />
      )}
    </div>
  );
};