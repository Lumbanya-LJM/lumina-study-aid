import { LMVLogo } from '@/components/ui/lmv-logo';

export const PageLoader = () => (
  <div className="flex h-screen w-full items-center justify-center">
    <div className="animate-pulse">
      <LMVLogo size="lg" />
    </div>
  </div>
);
