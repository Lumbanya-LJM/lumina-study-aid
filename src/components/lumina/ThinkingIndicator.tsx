import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface ThinkingIndicatorProps {
  action?: string;
  hasWebSearch?: boolean;
}

const thinkingStates = [
  { text: "Understanding your question...", emoji: "🤔", duration: 1500 },
  { text: "Processing your request...", emoji: "🧠", duration: 1500 },
  { text: "Thinking...", emoji: "🤔", duration: 1500 },
  { text: "Formulating response...", emoji: "💡", duration: 1500 },
];

const researchStates = [
  { text: "Analyzing your query...", emoji: "🤔", duration: 1200 },
  { text: "Searching the web...", emoji: "🔍", duration: 2000 },
  { text: "Gathering information...", emoji: "📚", duration: 1800 },
  { text: "Reviewing sources...", emoji: "📖", duration: 1500 },
  { text: "Synthesizing findings...", emoji: "💡", duration: 1500 },
];

const flashcardStates = [
  { text: "Analyzing the topic...", emoji: "🤔", duration: 1200 },
  { text: "Identifying key concepts...", emoji: "🧠", duration: 1500 },
  { text: "Creating flashcards...", emoji: "✨", duration: 2000 },
];

const quizStates = [
  { text: "Understanding the topic...", emoji: "🤔", duration: 1200 },
  { text: "Crafting questions...", emoji: "📝", duration: 1500 },
  { text: "Building your quiz...", emoji: "✨", duration: 2000 },
];

const summarizeStates = [
  { text: "Reading the case...", emoji: "📚", duration: 1500 },
  { text: "Extracting key points...", emoji: "🔍", duration: 1500 },
  { text: "Summarizing...", emoji: "💡", duration: 1800 },
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
  
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % states.length);
    }, currentState.duration);
    
    return () => clearInterval(interval);
  }, [currentIndex, states.length, currentState.duration]);
  
  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        <span 
          className={cn(
            "text-lg inline-block",
            "animate-emoji-enter"
          )}
          key={currentState.emoji}
        >
          {currentState.emoji}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span 
          className="text-sm text-muted-foreground animate-text-fade" 
          key={currentState.text}
        >
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
