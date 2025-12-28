import React, { useState, useEffect } from 'react';
import { Brain, Search, Sparkles, BookOpen, FileText, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';

const ThinkingEmoji = ({ className }: { className?: string }) => (
  <span className={cn("text-lg", className)}>🤔</span>
);

interface ThinkingIndicatorProps {
  action?: string;
  hasWebSearch?: boolean;
}

const thinkingStates = [
  { text: "Understanding your question...", icon: Brain, duration: 1500 },
  { text: "Processing your request...", icon: Sparkles, duration: 1500 },
  { text: "Thinking...", icon: Lightbulb, duration: 1500 },
  { text: "Formulating response...", icon: FileText, duration: 1500 },
];

const researchStates = [
  { text: "Analyzing your query...", icon: Brain, duration: 1200 },
  { text: "Searching the web...", icon: Search, duration: 2000 },
  { text: "Gathering information...", icon: BookOpen, duration: 1800 },
  { text: "Reviewing sources...", icon: FileText, duration: 1500 },
  { text: "Synthesizing findings...", icon: Sparkles, duration: 1500 },
];

const flashcardStates = [
  { text: "Analyzing the topic...", icon: Brain, duration: 1200 },
  { text: "Identifying key concepts...", icon: Lightbulb, duration: 1500 },
  { text: "Creating flashcards...", icon: FileText, duration: 2000 },
];

const quizStates = [
  { text: "Understanding the topic...", icon: Brain, duration: 1200 },
  { text: "Crafting questions...", icon: Lightbulb, duration: 1500 },
  { text: "Building your quiz...", icon: FileText, duration: 2000 },
];

const summarizeStates = [
  { text: "Reading the case...", icon: BookOpen, duration: 1500 },
  { text: "Extracting key points...", icon: Brain, duration: 1500 },
  { text: "Summarizing...", icon: FileText, duration: 1800 },
];

export const ThinkingIndicator: React.FC<ThinkingIndicatorProps> = ({ 
  action, 
  hasWebSearch = false 
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Select the appropriate states based on action
  const getStates = () => {
    if (hasWebSearch) return researchStates;
    switch (action) {
      case 'flashcards': return flashcardStates;
      case 'quiz': return quizStates;
      case 'summarise': return summarizeStates;
      default: return thinkingStates;
    }
  };
  
  const states = getStates();
  const currentState = states[currentIndex];
  const CurrentIcon = currentState.icon;
  
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % states.length);
    }, currentState.duration);
    
    return () => clearInterval(interval);
  }, [currentIndex, states.length, currentState.duration]);
  
  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        <ThinkingEmoji 
          className={cn(
            "transition-all duration-300",
            "animate-thinking"
          )} 
        />
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground animate-fade-in">
          {currentState.text}
        </span>
        <div className="flex items-center gap-0.5">
          <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
};
