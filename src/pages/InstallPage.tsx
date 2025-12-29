import React, { useEffect, useState } from 'react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { LMVLogo } from '@/components/ui/lmv-logo';
import { Download, Share, Plus, Check, Smartphone, Apple, Chrome } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const InstallPage: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Detect platform
    const userAgent = navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));
    setIsAndroid(/android/.test(userAgent));

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  return (
    <MobileLayout showNav={false}>
      <div className="px-5 py-8 safe-top min-h-screen flex flex-col">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <LMVLogo size="lg" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Install Luminary Study</h1>
          <p className="text-muted-foreground">Get the full app experience on your device</p>
        </div>

        {/* Already Installed */}
        {isInstalled ? (
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mb-4">
              <Check className="w-10 h-10 text-success" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">Already Installed!</h2>
            <p className="text-muted-foreground text-center">
              Luminary Study is already installed on your device.
            </p>
          </div>
        ) : (
          <>
            {/* Benefits */}
            <div className="bg-card rounded-2xl p-5 border border-border/50 shadow-card mb-6">
              <h2 className="font-semibold text-foreground mb-4">Why install?</h2>
              <div className="space-y-3">
                {[
                  { icon: Smartphone, text: 'Works offline - study anywhere' },
                  { icon: Download, text: 'Quick access from home screen' },
                  { icon: Check, text: 'Faster loading & better performance' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <item.icon className="w-5 h-5 text-primary" />
                    </div>
                    <p className="text-foreground">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Install Instructions */}
            {deferredPrompt ? (
              // Chrome/Android install button
              <button
                onClick={handleInstall}
                className="w-full gradient-primary text-primary-foreground py-4 rounded-2xl font-semibold text-lg shadow-glow flex items-center justify-center gap-3 mb-4"
              >
                <Download className="w-5 h-5" />
                Install App
              </button>
            ) : isIOS ? (
              // iOS instructions
              <div className="bg-secondary rounded-2xl p-5 border border-border/50">
                <div className="flex items-center gap-3 mb-4">
                  <Apple className="w-6 h-6 text-foreground" />
                  <h3 className="font-semibold text-foreground">Install on iPhone/iPad</h3>
                </div>
                <ol className="space-y-3 text-muted-foreground">
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-medium flex items-center justify-center shrink-0">1</span>
                    <span>Tap the <Share className="w-4 h-4 inline text-primary" /> Share button in Safari</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-medium flex items-center justify-center shrink-0">2</span>
                    <span>Scroll and tap <Plus className="w-4 h-4 inline text-primary" /> "Add to Home Screen"</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-medium flex items-center justify-center shrink-0">3</span>
                    <span>Tap "Add" to install</span>
                  </li>
                </ol>
              </div>
            ) : isAndroid ? (
              // Android instructions (fallback if no prompt)
              <div className="bg-secondary rounded-2xl p-5 border border-border/50">
                <div className="flex items-center gap-3 mb-4">
                  <Chrome className="w-6 h-6 text-foreground" />
                  <h3 className="font-semibold text-foreground">Install on Android</h3>
                </div>
                <ol className="space-y-3 text-muted-foreground">
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-medium flex items-center justify-center shrink-0">1</span>
                    <span>Tap the menu (⋮) in Chrome</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-medium flex items-center justify-center shrink-0">2</span>
                    <span>Tap "Add to Home screen"</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-medium flex items-center justify-center shrink-0">3</span>
                    <span>Tap "Add" to confirm</span>
                  </li>
                </ol>
              </div>
            ) : (
              // Desktop/other browsers
              <div className="bg-secondary rounded-2xl p-5 border border-border/50">
                <div className="flex items-center gap-3 mb-4">
                  <Chrome className="w-6 h-6 text-foreground" />
                  <h3 className="font-semibold text-foreground">Install on Desktop</h3>
                </div>
                <p className="text-muted-foreground">
                  Look for the install icon <Download className="w-4 h-4 inline text-primary" /> in your browser's address bar, or use your browser's menu to install this app.
                </p>
              </div>
            )}
          </>
        )}

        {/* Footer */}
        <div className="mt-auto pt-6 text-center">
          <p className="text-xs text-muted-foreground">
            Luminary Innovision Academy — Law • Business • Health
          </p>
        </div>
      </div>
    </MobileLayout>
  );
};

export default InstallPage;
