import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LMVLogo } from '@/components/ui/lmv-logo';
import { LuminaAvatar } from '@/components/lumina/LuminaAvatar';

const SplashScreen: React.FC = () => {
  const navigate = useNavigate();
  const [stage, setStage] = useState<'logo' | 'lumina' | 'complete'>('logo');

  useEffect(() => {
    const timer1 = setTimeout(() => setStage('lumina'), 1200);
    const timer2 = setTimeout(() => setStage('complete'), 2400);
    const timer3 = setTimeout(() => navigate('/home'), 3200);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [navigate]);

  return (
    <div className="mobile-container min-h-screen bg-background flex flex-col items-center justify-center relative overflow-hidden">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 gradient-subtle" />
      
      {/* Decorative circles */}
      <div className="absolute top-20 right-10 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-32 left-10 w-48 h-48 bg-primary/5 rounded-full blur-3xl" />

      <div className="relative z-10 flex flex-col items-center gap-12">
        {/* Logo Animation */}
        <div className={`transition-all duration-700 ${stage === 'logo' ? 'scale-100 opacity-100' : 'scale-95 opacity-100'}`}>
          <LMVLogo size="xl" />
        </div>

        {/* Lumina Introduction */}
        <div className={`flex flex-col items-center gap-4 transition-all duration-700 ${stage !== 'logo' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <LuminaAvatar size="xl" isActive={stage === 'complete'} />
          <div className="text-center">
            <h2 className="text-xl font-semibold text-foreground mb-1">Meet Lumina</h2>
            <p className="text-sm text-muted-foreground">Your AI Study Companion</p>
          </div>
        </div>

        {/* Loading indicator */}
        <div className={`flex gap-1.5 transition-all duration-500 ${stage === 'complete' ? 'opacity-0' : 'opacity-100'}`}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-primary animate-pulse"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>

      {/* Bottom tagline */}
      <div className="absolute bottom-12 left-0 right-0 text-center">
        <p className="text-xs text-muted-foreground tracking-widest uppercase">
          Excellence in Legal Education
        </p>
      </div>
    </div>
  );
};

export default SplashScreen;