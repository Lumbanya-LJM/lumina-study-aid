import React from 'react';
import { Clock, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReadingTimeProps {
  text: string;
  wordsPerMinute?: number;
  className?: string;
  showIcon?: boolean;
}

export const calculateReadingTime = (text: string, wordsPerMinute = 200): number => {
  const wordCount = text.trim().split(/\s+/).length;
  return Math.ceil(wordCount / wordsPerMinute);
};

export const ReadingTime: React.FC<ReadingTimeProps> = ({
  text,
  wordsPerMinute = 200,
  className,
  showIcon = true,
}) => {
  const minutes = calculateReadingTime(text, wordsPerMinute);
  const wordCount = text.trim().split(/\s+/).length;

  return (
    <div className={cn('flex items-center gap-2 text-xs text-muted-foreground', className)}>
      {showIcon && <Clock className="w-3 h-3" />}
      <span>{minutes} min read</span>
      <span className="text-muted-foreground/50">•</span>
      <span className="flex items-center gap-1">
        <BookOpen className="w-3 h-3" />
        {wordCount.toLocaleString()} words
      </span>
    </div>
  );
};

export default ReadingTime;
