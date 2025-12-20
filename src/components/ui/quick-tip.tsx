import React, { useState, useEffect } from 'react';
import { X, Lightbulb, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuickTips, QuickTip as QuickTipType } from '@/hooks/useQuickTips';

interface QuickTipProps {
  tipId: string;
  className?: string;
  position?: 'top' | 'bottom' | 'inline';
  delay?: number;
}

export const QuickTip: React.FC<QuickTipProps> = ({
  tipId,
  className,
  position = 'bottom',
  delay = 500,
}) => {
  const { hasSeenTip, markTipAsSeen, quickTipsData } = useQuickTips();
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const tip = quickTipsData[tipId];

  useEffect(() => {
    if (!tip || hasSeenTip(tipId)) return;

    const timer = setTimeout(() => {
      setIsVisible(true);
      setIsAnimating(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [tipId, tip, hasSeenTip, delay]);

  const handleDismiss = () => {
    setIsAnimating(false);
    setTimeout(() => {
      setIsVisible(false);
      markTipAsSeen(tipId);
    }, 200);
  };

  if (!tip || !isVisible) return null;

  return (
    <div
      className={cn(
        'transition-all duration-300',
        isAnimating ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2',
        position === 'top' && 'mb-3',
        position === 'bottom' && 'mt-3',
        className
      )}
    >
      <div className="relative bg-primary/10 border border-primary/20 rounded-2xl p-4 backdrop-blur-sm">
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-1 rounded-full hover:bg-primary/20 transition-colors"
          aria-label="Dismiss tip"
        >
          <X className="w-4 h-4 text-primary" />
        </button>

        <div className="flex items-start gap-3 pr-6">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
            <Lightbulb className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold text-foreground text-sm">{tip.title}</h4>
              <Sparkles className="w-3 h-3 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {tip.description}
            </p>
          </div>
        </div>

        <button
          onClick={handleDismiss}
          className="mt-3 text-xs font-medium text-primary hover:underline"
        >
          Got it!
        </button>
      </div>
    </div>
  );
};

// Floating quick tip that appears over content
interface FloatingQuickTipProps {
  tipId: string;
  className?: string;
  anchor?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

export const FloatingQuickTip: React.FC<FloatingQuickTipProps> = ({
  tipId,
  className,
  anchor = 'bottom-right',
}) => {
  const { hasSeenTip, markTipAsSeen, quickTipsData } = useQuickTips();
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const tip = quickTipsData[tipId];

  useEffect(() => {
    if (!tip || hasSeenTip(tipId)) return;

    const timer = setTimeout(() => {
      setIsVisible(true);
      setTimeout(() => setIsAnimating(true), 50);
    }, 1000);

    return () => clearTimeout(timer);
  }, [tipId, tip, hasSeenTip]);

  const handleDismiss = () => {
    setIsAnimating(false);
    setTimeout(() => {
      setIsVisible(false);
      markTipAsSeen(tipId);
    }, 200);
  };

  if (!tip || !isVisible) return null;

  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-20 left-4',
    'bottom-right': 'bottom-20 right-4',
  };

  return (
    <div
      className={cn(
        'fixed z-50 max-w-xs transition-all duration-300',
        positionClasses[anchor],
        isAnimating ? 'opacity-100 scale-100' : 'opacity-0 scale-95',
        className
      )}
    >
      <div className="bg-card border border-border rounded-2xl p-4 shadow-lg">
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-1 rounded-full hover:bg-muted transition-colors"
          aria-label="Dismiss tip"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>

        <div className="flex items-start gap-3 pr-6">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shrink-0 shadow-glow">
            <Lightbulb className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium text-primary uppercase tracking-wide">Quick Tip</span>
            </div>
            <h4 className="font-semibold text-foreground text-sm mb-1">{tip.title}</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {tip.description}
            </p>
          </div>
        </div>

        <div className="flex justify-end mt-3">
          <button
            onClick={handleDismiss}
            className="px-3 py-1.5 text-xs font-medium text-primary-foreground bg-primary rounded-lg hover:opacity-90 transition-opacity"
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
};
