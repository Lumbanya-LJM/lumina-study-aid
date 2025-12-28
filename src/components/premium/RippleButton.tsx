import React, { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';

interface RippleProps {
  x: number;
  y: number;
  size: number;
}

interface RippleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  rippleColor?: string;
}

export const RippleButton: React.FC<RippleButtonProps> = ({
  children,
  className,
  rippleColor = 'bg-white/30',
  onClick,
  ...props
}) => {
  const [ripples, setRipples] = useState<RippleProps[]>([]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const button = e.currentTarget;
      const rect = button.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 2;
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;

      const newRipple = { x, y, size };
      setRipples((prev) => [...prev, newRipple]);
      haptics.light();

      // Remove ripple after animation
      setTimeout(() => {
        setRipples((prev) => prev.slice(1));
      }, 600);

      onClick?.(e);
    },
    [onClick]
  );

  return (
    <button
      className={cn('relative overflow-hidden', className)}
      onClick={handleClick}
      {...props}
    >
      {ripples.map((ripple, index) => (
        <span
          key={index}
          className={cn('absolute rounded-full animate-ripple pointer-events-none', rippleColor)}
          style={{
            left: ripple.x,
            top: ripple.y,
            width: ripple.size,
            height: ripple.size,
          }}
        />
      ))}
      {children}
    </button>
  );
};

export default RippleButton;
