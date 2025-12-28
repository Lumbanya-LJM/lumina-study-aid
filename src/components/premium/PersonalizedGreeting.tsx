import React from 'react';
import { Sparkles, Sun, Moon, Sunrise, Sunset } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PersonalizedGreetingProps {
  name: string;
  className?: string;
  showIcon?: boolean;
}

interface GreetingData {
  greeting: string;
  icon: React.ElementType;
  encouragement: string;
  gradient: string;
}

const getGreetingData = (): GreetingData => {
  const hour = new Date().getHours();
  
  if (hour >= 5 && hour < 12) {
    return {
      greeting: 'Good morning',
      icon: Sunrise,
      encouragement: 'Fresh start, endless possibilities!',
      gradient: 'from-amber-500/20 to-orange-500/20'
    };
  } else if (hour >= 12 && hour < 17) {
    return {
      greeting: 'Good afternoon',
      icon: Sun,
      encouragement: 'Keep the momentum going!',
      gradient: 'from-yellow-500/20 to-amber-500/20'
    };
  } else if (hour >= 17 && hour < 21) {
    return {
      greeting: 'Good evening',
      icon: Sunset,
      encouragement: 'Great time for focused study!',
      gradient: 'from-purple-500/20 to-pink-500/20'
    };
  } else {
    return {
      greeting: 'Good night',
      icon: Moon,
      encouragement: 'Burning the midnight oil?',
      gradient: 'from-indigo-500/20 to-purple-500/20'
    };
  }
};

export const PersonalizedGreeting: React.FC<PersonalizedGreetingProps> = ({ 
  name, 
  className,
  showIcon = true 
}) => {
  const { greeting, icon: Icon, encouragement, gradient } = getGreetingData();
  const firstName = name?.split(' ')[0] || 'Student';

  return (
    <div className={cn('relative', className)}>
      <div className="flex items-center gap-2">
        {showIcon && (
          <div className={cn('p-2 rounded-xl bg-gradient-to-br', gradient)}>
            <Icon className="w-5 h-5 text-foreground" />
          </div>
        )}
        <div>
          <p className="text-sm text-muted-foreground">{greeting}, {firstName}!</p>
          <p className="text-xs text-muted-foreground/70 flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            {encouragement}
          </p>
        </div>
      </div>
    </div>
  );
};

export const useGreeting = () => {
  const data = getGreetingData();
  return data;
};

export default PersonalizedGreeting;
