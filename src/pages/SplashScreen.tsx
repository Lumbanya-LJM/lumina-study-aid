import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LMVLogo } from '@/components/ui/lmv-logo';
import { LuminaAvatar } from '@/components/lumina/LuminaAvatar';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';

const SplashScreen: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { portalPath, loading: roleLoading } = useUserRole();
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
    if (stage !== 'complete' || authLoading || roleLoading) return;

    const navTimer = setTimeout(() => {
      if (!user) {
        navigate('/welcome');
      } else {
        navigate(portalPath);
      }
    }, 800);

    return () => clearTimeout(navTimer);
  }, [stage, authLoading, roleLoading, user, navigate, portalPath]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center relative overflow-hidden">
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
          <LuminaAvatar size="xl" isActive={stage === 'complete'} />
          <div className="text-center mt-6">
            <h2 className="text-2xl md:text-3xl font-display font-semibold text-foreground">
              Meet Lumina
            </h2>
            <p className="text-sm md:text-base text-muted-foreground mt-2">
              Your AI Study Companion
            </p>
          </div>
        </div>

        {/* Loading bar */}
        <div className={`mt-12 w-48 transition-all duration-500 ${
          stage === 'complete' ? 'opacity-0' : 'opacity-100'
        }`}>
          <div className="h-1 bg-secondary rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary rounded-full transition-all duration-[3000ms] ease-out"
              style={{ width: stage === 'logo' ? '30%' : stage === 'lumina' ? '70%' : '100%' }}
            />
          </div>
          <p className="text-xs text-muted-foreground text-center mt-3">Loading...</p>
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
