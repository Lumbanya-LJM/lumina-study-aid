import React, { useState } from 'react';
import { LuminaAvatar } from '@/components/lumina/LuminaAvatar';
import { Button } from '@/components/ui/button';
import { 
  MessageCircle, 
  Calendar, 
  Focus, 
  BookOpen, 
  Trophy,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Hand
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSwipeGesture } from '@/hooks/useSwipeGesture';

interface OnboardingStep {
  title: string;
  description: string;
  icon: React.ElementType;
  highlight: string;
}

const steps: OnboardingStep[] = [
  {
    title: "Meet Lumina, Your AI Study Assistant",
    description: "Lumina can do much more than chat! Ask her to add tasks to your planner, create flashcards, generate quizzes, and even search legal databases - all from one conversation.",
    icon: MessageCircle,
    highlight: "Your personal study AI"
  },
  {
    title: "Lumina Academy - Learn from Experts",
    description: "Enrol in courses taught by qualified legal professionals. Attend live classes, access course materials, watch recordings, and get AI summaries of every session.",
    icon: Calendar,
    highlight: "Live classes & recordings"
  },
  {
    title: "Smart Study Planner",
    description: "Upload your timetable or ask Lumina to create a study schedule. Get reminders for tasks and let Lumina manage your study sessions intelligently.",
    icon: Focus,
    highlight: "AI-powered scheduling"
  },
  {
    title: "Legal Research & Library",
    description: "Access past papers, case summaries, and legal alerts. Search ZambiaLII directly through Lumina and get instant AI-powered case summaries.",
    icon: BookOpen,
    highlight: "Everything in one place"
  },
  {
    title: "Track Progress & Achievements",
    description: "Earn badges, maintain study streaks, and view analytics. Store your notes in Lumina Vault and review with AI-generated flashcards and quizzes.",
    icon: Trophy,
    highlight: "Gamified learning"
  }
];

interface OnboardingTutorialProps {
  onComplete: () => void;
}

export const OnboardingTutorial: React.FC<OnboardingTutorialProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep(prev => prev + 1);
        setIsAnimating(false);
      }, 200);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep(prev => prev - 1);
        setIsAnimating(false);
      }, 200);
    }
  };

  const handleComplete = () => {
    localStorage.setItem('luminary_onboarding_complete', 'true');
    onComplete();
  };

  const handleSkip = () => {
    localStorage.setItem('luminary_onboarding_complete', 'true');
    onComplete();
  };

  const swipeHandlers = useSwipeGesture({
    onSwipeLeft: handleNext,
    onSwipeRight: handlePrev,
    minSwipeDistance: 50
  });

  const step = steps[currentStep];
  const Icon = step.icon;

  return (
    <div 
      className="fixed inset-0 z-50 bg-background"
      onTouchStart={swipeHandlers.onTouchStart}
      onTouchMove={swipeHandlers.onTouchMove}
      onTouchEnd={swipeHandlers.onTouchEnd}
    >
      <div className="flex flex-col min-h-screen safe-top safe-bottom">
        {/* Header */}
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-2">
            {steps.map((_, index) => (
              <div
                key={index}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  index === currentStep 
                    ? "w-8 bg-primary" 
                    : index < currentStep 
                      ? "w-4 bg-primary/50"
                      : "w-4 bg-border"
                )}
              />
            ))}
          </div>
          <button 
            type="button"
            onClick={handleSkip}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className={cn(
            "transition-all duration-300 w-full max-w-md text-center",
            isAnimating ? "opacity-0 translate-x-4" : "opacity-100 translate-x-0"
          )}>
            {/* Icon/Avatar Area */}
            <div className="mb-8">
              {currentStep === 0 ? (
                <div className="relative inline-block">
                  <LuminaAvatar size="xl" isActive />
                  <div className="absolute -bottom-2 -right-2 w-12 h-12 gradient-primary rounded-2xl flex items-center justify-center shadow-glow">
                    <Sparkles className="w-6 h-6 text-primary-foreground" />
                  </div>
                </div>
              ) : (
                <div className="w-32 h-32 mx-auto rounded-3xl gradient-primary flex items-center justify-center shadow-glow">
                  <Icon className="w-16 h-16 text-primary-foreground" />
                </div>
              )}
            </div>

            {/* Text */}
            <h2 className="text-2xl font-bold text-foreground mb-4">
              {step.title}
            </h2>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              {step.description}
            </p>
            
            {/* Highlight Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">{step.highlight}</span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="p-6 space-y-4">
          <div className="flex gap-3">
            {currentStep > 0 && (
              <Button
                type="button"
                variant="outline"
                onClick={handlePrev}
                className="flex-1"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
            )}
            <Button
              type="button"
              onClick={handleNext}
              className={cn(
                "flex-1 bg-primary hover:bg-primary/90 text-primary-foreground",
                currentStep === 0 && "w-full"
              )}
            >
              {currentStep === steps.length - 1 ? (
                <>
                  Get Started
                  <Sparkles className="w-4 h-4 ml-1" />
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </>
              )}
            </Button>
          </div>

          {/* Swipe Hint */}
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground mb-3">
            <ChevronLeft className="w-3 h-3" />
            <Hand className="w-4 h-4 animate-pulse" />
            <span>Swipe to navigate</span>
            <ChevronRight className="w-3 h-3" />
          </div>

          {/* Quick Navigation Dots */}
          <div className="flex justify-center gap-2">
            {steps.map((_, index) => (
              <button
                type="button"
                key={index}
                onClick={() => {
                  setIsAnimating(true);
                  setTimeout(() => {
                    setCurrentStep(index);
                    setIsAnimating(false);
                  }, 200);
                }}
                className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  index === currentStep 
                    ? "bg-primary scale-125" 
                    : "bg-border hover:bg-muted-foreground"
                )}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
