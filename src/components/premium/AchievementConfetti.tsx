import React, { useEffect } from 'react';
import { Confetti } from './Confetti';
import { useConfettiStore } from '@/hooks/useAchievements';

export const AchievementConfetti: React.FC = () => {
  const { showConfetti, hideConfetti } = useConfettiStore();

  return (
    <Confetti 
      active={showConfetti} 
      onComplete={hideConfetti}
      duration={3000}
    />
  );
};
