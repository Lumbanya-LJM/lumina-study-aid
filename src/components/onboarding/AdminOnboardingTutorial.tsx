import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Shield, 
  Users, 
  GraduationCap, 
  FileText, 
  BarChart3,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  UserPlus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSwipeGesture } from '@/hooks/useSwipeGesture';

interface OnboardingStep {
  title: string;
  description: string;
  icon: React.ElementType;
  highlight: string;
}

const adminSteps: OnboardingStep[] = [
  {
    title: "Welcome to LMV Admin",
    description: "As an administrator, you have full control over the Lumina Academy platform. Manage courses, tutors, students, and content from one central dashboard.",
    icon: Shield,
    highlight: "Platform management"
  },
  {
    title: "Manage Courses",
    description: "Create and configure courses, set pricing, assign tutors, and control course visibility. Bulk enrol students and manage course materials.",
    icon: GraduationCap,
    highlight: "Course administration"
  },
  {
    title: "Tutor Management",
    description: "Review tutor applications, approve or reject applicants, and monitor tutor performance. View class attendance and engagement metrics.",
    icon: UserPlus,
    highlight: "Tutor oversight"
  },
  {
    title: "Student Management",
    description: "View all enrolled students, manage enrollments, and track student progress across courses. Support students with account issues.",
    icon: Users,
    highlight: "Student support"
  },
  {
    title: "Content & Library",
    description: "Curate the content library with past papers, case summaries, and study materials. Manage legal alerts and featured resources.",
    icon: FileText,
    highlight: "Content curation"
  },
  {
    title: "Analytics & Reports",
    description: "Access platform-wide analytics including enrollment trends, class attendance, and engagement metrics. Generate reports for insights.",
    icon: BarChart3,
    highlight: "Data insights"
  }
];

interface AdminOnboardingTutorialProps {
  onComplete: () => void;
}

export const AdminOnboardingTutorial: React.FC<AdminOnboardingTutorialProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleNext = () => {
    if (currentStep < adminSteps.length - 1) {
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
    localStorage.setItem('luminary_admin_onboarding_complete', 'true');
    onComplete();
  };

  const handleSkip = () => {
    localStorage.setItem('luminary_admin_onboarding_complete', 'true');
    onComplete();
  };

  const swipeHandlers = useSwipeGesture({
    onSwipeLeft: handleNext,
    onSwipeRight: handlePrev,
    minSwipeDistance: 50
  });

  const step = adminSteps[currentStep];
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
            {adminSteps.map((_, index) => (
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
            {/* Icon Area */}
            <div className="mb-8">
              <div className="w-32 h-32 mx-auto rounded-3xl gradient-primary flex items-center justify-center shadow-glow">
                <Icon className="w-16 h-16 text-primary-foreground" />
              </div>
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
              {currentStep === adminSteps.length - 1 ? (
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
            {adminSteps.map((_, index) => (
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
