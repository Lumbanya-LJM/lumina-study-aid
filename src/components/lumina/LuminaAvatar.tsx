import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { useSchool } from '@/hooks/useSchool';
import luminaAvatarDefault from '@/assets/lumina-avatar.png';
import luminaAvatarLaw from '@/assets/lumina-avatar-law.png';
import luminaAvatarBusiness from '@/assets/lumina-avatar-business.png';
import luminaAvatarHealth from '@/assets/lumina-avatar-health.png';

interface LuminaAvatarProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  isActive?: boolean;
  school?: 'law' | 'business' | 'health';
}

// Map school to avatar image
const avatarMap: Record<string, string> = {
  law: luminaAvatarLaw,
  business: luminaAvatarBusiness,
  health: luminaAvatarHealth,
};

// Map school to alt text
const altTextMap: Record<string, string> = {
  law: 'Lumina - Your Legal Study Mentor',
  business: 'Lumina - Your Business Learning Coach',
  health: 'Lumina - Your Health Sciences Mentor',
};

export const LuminaAvatar: React.FC<LuminaAvatarProps> = ({
  size = 'md',
  className,
  isActive = false,
  school,
}) => {
  const { school: userSchool, loading: schoolLoading } = useSchool();
  const [imageLoaded, setImageLoaded] = useState(false);
  
  // Use provided school prop, or fall back to context, or default
  const activeSchool = school || userSchool || 'law';
  
  const sizes = {
    sm: 'w-10 h-10',
    md: 'w-14 h-14',
    lg: 'w-20 h-20',
    xl: 'w-32 h-32',
  };

  // Get the appropriate avatar for the school
  const avatarSrc = avatarMap[activeSchool] || luminaAvatarDefault;
  const altText = altTextMap[activeSchool] || 'Lumina - Your AI Study Buddy';

  // Show placeholder while loading to prevent flash
  const showPlaceholder = schoolLoading || !imageLoaded;

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
        {/* Placeholder shown during load */}
        {showPlaceholder && (
          <div className="absolute inset-0 bg-secondary animate-pulse" />
        )}
        <img
          src={avatarSrc}
          alt={altText}
          className={cn(
            "w-full h-full object-cover transition-opacity duration-200",
            showPlaceholder ? "opacity-0" : "opacity-100"
          )}
          onLoad={() => setImageLoaded(true)}
        />
      </div>
      {isActive && (
        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-success rounded-full border-2 border-background" />
      )}
    </div>
  );
};
