import React, { useState, useEffect } from 'react';
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
  X,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface OnboardingStep {
  title: string;
  description: string;
  icon: React.ElementType;
  highlight: string;
}

const steps: OnboardingStep[] = [
  {
    title: "Meet Lumina, Your Study Buddy",
    description: "I'm here to help you excel in your law studies! Ask me to summarise cases, create flashcards, quiz you on topics, or help manage your study schedule.",
    icon: MessageCircle,
    highlight: "Chat with me anytime!"
  },
  {
    title: "Smart Study Planner",
    description: "Create a personalised study schedule based on your university timetable. I'll remind you of pre-class prep, post-class recaps, and optimal review times.",
    icon: Calendar,
    highlight: "Upload your timetable to get started"
  },
  {
    title: "Deep Focus Mode",
    description: "When it's time to concentrate, activate Focus Mode to block distractions. Choose Hard Mode for maximum focus or Lite Mode for gentle reminders.",
    icon: Focus,
    highlight: "Pomodoro timer with breaks"
  },
  {
    title: "Rich Content Library",
    description: "Access past papers, case summaries, revision kits, and legal alerts curated for Zambian law students. Generate AI summaries instantly.",
    icon: BookOpen,
    highlight: "Everything in one place"
  },
  {
    title: "Track Your Progress",
    description: "Earn achievements, maintain study streaks, and view detailed analytics. Share your progress with accountability partners to stay motivated!",
    icon: Trophy,
    highlight: "Gamified learning"
  }
];

interface OnboardingTutorialProps {
  onComplete: () => void;
}

export const OnboardingTutorial: React.FC<OnboardingTutorialProps> = ({ onComplete }) => {
  const navigate = useNavigate();
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

  const step = steps[currentStep];
  const Icon = step.icon;

  return (
    <div className="fixed inset-0 z-50 bg-background">
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
                variant="outline"
                onClick={handlePrev}
                className="flex-1"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
            )}
            <Button
              onClick={handleNext}
              className={cn(
                "flex-1 gradient-primary text-primary-foreground",
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

          {/* Quick Navigation Dots */}
          <div className="flex justify-center gap-2">
            {steps.map((_, index) => (
              <button
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
