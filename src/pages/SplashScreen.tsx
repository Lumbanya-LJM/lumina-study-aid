import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LMVLogo } from '@/components/ui/lmv-logo';
import { LuminaAvatar } from '@/components/lumina/LuminaAvatar';
import { useAuth } from '@/hooks/useAuth';

const SplashScreen: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [stage, setStage] = useState<'logo' | 'lumina' | 'complete'>('logo');

  useEffect(() => {
    const timer1 = setTimeout(() => setStage('lumina'), 1500);
    const timer2 = setTimeout(() => setStage('complete'), 3000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  // Navigate after loading is complete and animation finishes
  useEffect(() => {
    if (stage === 'complete' && !loading) {
      const navTimer = setTimeout(() => {
        navigate(user ? '/home' : '/auth');
      }, 800);
      return () => clearTimeout(navTimer);
    }
  }, [stage, loading, user, navigate]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-primary/3 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-primary/5 rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] border border-primary/10 rounded-full" />
      </div>

      <div className="relative z-10 flex flex-col items-center">
        {/* Logo with elegant fade */}
        <div className={`transition-all duration-1000 ease-out ${
          stage === 'logo' 
            ? 'opacity-100 scale-100' 
            : 'opacity-100 scale-90 -translate-y-8'
        }`}>
          <LMVLogo size="xl" />
        </div>

        {/* Tagline */}
        <p className={`mt-4 text-sm md:text-base text-muted-foreground tracking-wide transition-all duration-700 ${
          stage === 'logo' ? 'opacity-100' : 'opacity-0'
        }`}>
          Excellence in Legal Education
        </p>

        {/* Lumina Avatar reveal */}
        <div className={`mt-12 flex flex-col items-center transition-all duration-1000 ease-out ${
          stage !== 'logo' 
            ? 'opacity-100 translate-y-0' 
            : 'opacity-0 translate-y-12 pointer-events-none'
        }`}>
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse" />
            <LuminaAvatar size="xl" isActive={stage === 'complete'} />
          </div>
          <div className="text-center mt-6">
            <h2 className="text-2xl md:text-3xl font-display font-semibold text-foreground">
              Meet Lumina
            </h2>
            <p className="text-sm md:text-base text-muted-foreground mt-2">
              Your AI Study Companion
            </p>
          </div>
        </div>

        {/* Loading indicator */}
        <div className={`mt-12 transition-all duration-500 ${
          stage === 'complete' ? 'opacity-0' : 'opacity-100'
        }`}>
          <div className="flex gap-2">
            {[0, 1, 2].map((i) => (
              <div 
                key={i} 
                className="w-2.5 h-2.5 rounded-full bg-primary animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Footer branding */}
      <div className={`absolute bottom-8 left-0 right-0 text-center transition-all duration-700 ${
        stage === 'complete' ? 'opacity-0' : 'opacity-100'
      }`}>
        <p className="text-xs text-muted-foreground tracking-widest uppercase">
          🇿🇲 Made for Zambian Law Students
        </p>
      </div>
    </div>
  );
};

export default SplashScreen;
