import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface ConfettiPiece {
  id: number;
  x: number;
  y: number;
  rotation: number;
  color: string;
  size: number;
  velocityX: number;
  velocityY: number;
  rotationSpeed: number;
  shape: 'square' | 'circle' | 'triangle';
}

interface ConfettiProps {
  active: boolean;
  duration?: number;
  particleCount?: number;
  onComplete?: () => void;
}

const COLORS = [
  'hsl(195, 43%, 29%)', // Primary teal
  'hsl(195, 43%, 45%)', // Lighter teal
  'hsl(38, 92%, 50%)',  // Gold
  'hsl(142, 71%, 45%)', // Green
  'hsl(200, 35%, 22%)', // Dark teal
  'hsl(195, 35%, 70%)', // Light teal
];

export const Confetti: React.FC<ConfettiProps> = ({
  active,
  duration = 3000,
  particleCount = 100,
  onComplete,
}) => {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  const generatePieces = useCallback(() => {
    const newPieces: ConfettiPiece[] = [];
    const shapes: ConfettiPiece['shape'][] = ['square', 'circle', 'triangle'];
    
    for (let i = 0; i < particleCount; i++) {
      newPieces.push({
        id: i,
        x: Math.random() * 100,
        y: -10 - Math.random() * 20,
        rotation: Math.random() * 360,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        size: 8 + Math.random() * 8,
        velocityX: (Math.random() - 0.5) * 3,
        velocityY: 2 + Math.random() * 3,
        rotationSpeed: (Math.random() - 0.5) * 10,
        shape: shapes[Math.floor(Math.random() * shapes.length)],
      });
    }
    return newPieces;
  }, [particleCount]);

  useEffect(() => {
    if (active) {
      setIsVisible(true);
      setPieces(generatePieces());

      const timer = setTimeout(() => {
        setIsVisible(false);
        setPieces([]);
        onComplete?.();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [active, duration, generatePieces, onComplete]);

  useEffect(() => {
    if (!isVisible || pieces.length === 0) return;

    let animationFrame: number;
    let startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = elapsed / duration;

      if (progress >= 1) {
        return;
      }

      setPieces((prevPieces) =>
        prevPieces.map((piece) => ({
          ...piece,
          x: piece.x + piece.velocityX * 0.5,
          y: piece.y + piece.velocityY,
          rotation: piece.rotation + piece.rotationSpeed,
          velocityY: piece.velocityY + 0.1, // Gravity
        }))
      );

      animationFrame = requestAnimationFrame(animate);
    };

    animationFrame = requestAnimationFrame(animate);

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [isVisible, duration, pieces.length]);

  if (!isVisible) return null;

  const renderShape = (piece: ConfettiPiece) => {
    const style: React.CSSProperties = {
      position: 'absolute',
      left: `${piece.x}%`,
      top: `${piece.y}%`,
      width: piece.size,
      height: piece.size,
      backgroundColor: piece.shape !== 'triangle' ? piece.color : 'transparent',
      transform: `rotate(${piece.rotation}deg)`,
      borderRadius: piece.shape === 'circle' ? '50%' : '0',
      opacity: 0.9,
      pointerEvents: 'none',
    };

    if (piece.shape === 'triangle') {
      return (
        <div
          key={piece.id}
          style={{
            ...style,
            width: 0,
            height: 0,
            backgroundColor: 'transparent',
            borderLeft: `${piece.size / 2}px solid transparent`,
            borderRight: `${piece.size / 2}px solid transparent`,
            borderBottom: `${piece.size}px solid ${piece.color}`,
          }}
        />
      );
    }

    return <div key={piece.id} style={style} />;
  };

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 9999,
      }}
    >
      {pieces.map(renderShape)}
    </div>,
    document.body
  );
};

// Hook to trigger confetti
export const useConfetti = () => {
  const [isActive, setIsActive] = useState(false);

  const trigger = useCallback(() => {
    setIsActive(true);
  }, []);

  const reset = useCallback(() => {
    setIsActive(false);
  }, []);

  return { isActive, trigger, reset };
};
