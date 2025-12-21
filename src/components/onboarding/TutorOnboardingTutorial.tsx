import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  GraduationCap, 
  Bell, 
  Video, 
  FileText, 
  Users,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Calendar,
  BarChart3
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface OnboardingStep {
  title: string;
  description: string;
  icon: React.ElementType;
  highlight: string;
}

const tutorSteps: OnboardingStep[] = [
  {
    title: "Welcome to Lumina Teach",
    description: "Your dedicated tutor dashboard for managing courses, engaging students, and delivering impactful live classes. Let's walk you through the key features.",
    icon: GraduationCap,
    highlight: "Your teaching command centre"
  },
  {
    title: "Post Course Updates",
    description: "Keep your students informed with announcements, study tips, and important notices. Updates appear directly in students' feeds and can include class schedules.",
    icon: Bell,
    highlight: "Stay connected with students"
  },
  {
    title: "Schedule & Host Live Classes",
    description: "Create live video sessions with your students. Schedule classes in advance, and students will receive reminders. After class, AI generates summaries automatically.",
    icon: Video,
    highlight: "Interactive video sessions"
  },
  {
    title: "Upload Course Materials",
    description: "Share PDFs, documents, and study resources with enrolled students. Organise materials by topic and keep your content library up to date.",
    icon: FileText,
    highlight: "Centralised resource hub"
  },
  {
    title: "Track Student Engagement",
    description: "View enrolled students, monitor class attendance, and see engagement metrics. Understanding your students helps you deliver better content.",
    icon: Users,
    highlight: "Data-driven teaching"
  },
  {
    title: "View Class History",
    description: "Access past classes, recordings, and AI-generated summaries. Review transcripts and key points from previous sessions.",
    icon: Calendar,
    highlight: "Never lose a lesson"
  }
];

interface TutorOnboardingTutorialProps {
  onComplete: () => void;
}

export const TutorOnboardingTutorial: React.FC<TutorOnboardingTutorialProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleNext = () => {
    if (currentStep < tutorSteps.length - 1) {
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
    localStorage.setItem('luminary_tutor_onboarding_complete', 'true');
    onComplete();
  };

  const handleSkip = () => {
    localStorage.setItem('luminary_tutor_onboarding_complete', 'true');
    onComplete();
  };

  const step = tutorSteps[currentStep];
  const Icon = step.icon;

  return (
    <div className="fixed inset-0 z-50 bg-background">
      <div className="flex flex-col min-h-screen safe-top safe-bottom">
        {/* Header */}
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-2">
            {tutorSteps.map((_, index) => (
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
              {currentStep === tutorSteps.length - 1 ? (
                <>
                  Start Teaching
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
            {tutorSteps.map((_, index) => (
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
