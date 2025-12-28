import React, { useState, useRef, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  className?: string;
  threshold?: number;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({
  onRefresh,
  children,
  className,
  threshold = 80,
}) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (containerRef.current?.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (startY.current === 0 || isRefreshing) return;
    
    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;
    
    if (diff > 0 && containerRef.current?.scrollTop === 0) {
      // Apply resistance
      const distance = Math.min(diff * 0.5, threshold * 1.5);
      setPullDistance(distance);
      
      if (distance >= threshold) {
        haptics.light();
      }
    }
  }, [isRefreshing, threshold]);

  const handleTouchEnd = useCallback(async () => {
    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      haptics.medium();
      
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
    
    setPullDistance(0);
    startY.current = 0;
  }, [pullDistance, threshold, isRefreshing, onRefresh]);

  const progress = Math.min(pullDistance / threshold, 1);
  const rotation = progress * 180;

  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-auto', className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <div
        className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center transition-opacity z-10"
        style={{
          top: Math.max(pullDistance - 40, -40),
          opacity: progress,
        }}
      >
        <div className={cn(
          'w-10 h-10 rounded-full bg-card border border-border shadow-lg flex items-center justify-center',
          isRefreshing && 'animate-spin'
        )}>
          <RefreshCw 
            className="w-5 h-5 text-primary"
            style={{ transform: isRefreshing ? 'none' : `rotate(${rotation}deg)` }}
          />
        </div>
      </div>
      
      {/* Content with pull offset */}
      <div
        style={{
          transform: `translateY(${isRefreshing ? threshold / 2 : pullDistance}px)`,
          transition: pullDistance === 0 ? 'transform 0.2s ease-out' : 'none',
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default PullToRefresh;
