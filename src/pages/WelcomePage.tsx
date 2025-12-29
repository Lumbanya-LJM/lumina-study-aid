import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LMVLogo } from '@/components/ui/lmv-logo';
import { Scale, Briefcase, Heart, ArrowRight, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LMVSchool, SCHOOL_CONFIGS, getAllSchools } from '@/config/schools';
import { applySchoolTheme } from '@/hooks/useSchoolTheme';

const schoolIcons: Record<LMVSchool, React.ReactNode> = {
  law: <Scale className="w-8 h-8" />,
  business: <Briefcase className="w-8 h-8" />,
  health: <Heart className="w-8 h-8" />,
};

// School-specific gradient and color classes
const schoolStyles: Record<LMVSchool, { bg: string; border: string; icon: string }> = {
  law: {
    bg: 'bg-[hsl(220,56%,25%)]',
    border: 'border-[hsl(220,56%,25%)]',
    icon: 'bg-[hsl(220,56%,25%)] text-white',
  },
  business: {
    bg: 'bg-[hsl(155,45%,28%)]',
    border: 'border-[hsl(155,45%,28%)]',
    icon: 'bg-[hsl(155,45%,28%)] text-white',
  },
  health: {
    bg: 'bg-[hsl(195,43%,29%)]',
    border: 'border-[hsl(195,43%,29%)]',
    icon: 'bg-[hsl(195,43%,29%)] text-white',
  },
};

const WelcomePage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedSchool, setSelectedSchool] = useState<LMVSchool | null>(null);
  
  const schools = getAllSchools();

  // Apply school theme when selection changes (for preview)
  useEffect(() => {
    if (selectedSchool) {
      applySchoolTheme(selectedSchool);
    }
  }, [selectedSchool]);

  const handleSchoolSelect = (school: LMVSchool) => {
    setSelectedSchool(school);
  };

  const handleContinue = () => {
    if (selectedSchool) {
      // Store selected school in localStorage for use during signup
      localStorage.setItem('lmv_selected_school', selectedSchool);
      navigate(`/auth?school=${selectedSchool}`);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="px-6 py-8">
        <LMVLogo size="sm" variant="full" />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-12">
        <div className="text-center mb-10">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
            Welcome to Luminary Innovision Academy
          </h1>
          <p className="text-muted-foreground max-w-md">
            Choose your learning pathway
          </p>
        </div>

        <div className="w-full max-w-lg space-y-4">
          {schools.map((school) => {
            const isSelected = selectedSchool === school.id;
            const styles = schoolStyles[school.id];
            
            return (
              <button
                key={school.id}
                onClick={() => handleSchoolSelect(school.id)}
                className={cn(
                  "w-full p-6 rounded-2xl border-2 text-left transition-all duration-300",
                  "hover:shadow-lg",
                  isSelected
                    ? `${styles.border} bg-primary/5 shadow-lg`
                    : "border-border/50 bg-card hover:bg-card/80 hover:border-muted-foreground/30"
                )}
              >
                <div className="flex items-start gap-4">
                  <div className={cn(
                    "p-4 rounded-xl transition-all duration-300",
                    isSelected
                      ? styles.icon
                      : "bg-secondary text-secondary-foreground"
                  )}>
                    {schoolIcons[school.id]}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-foreground">
                        {school.name}
                      </h3>
                      {isSelected && (
                        <div className={cn("w-6 h-6 rounded-full flex items-center justify-center", styles.bg)}>
                          <ArrowRight className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 italic">
                      "{school.tagline}"
                    </p>
                    <p className="text-xs text-muted-foreground/80 mt-2">
                      {school.description}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Continue Button */}
        <button
          onClick={handleContinue}
          disabled={!selectedSchool}
          className={cn(
            "mt-8 w-full max-w-lg py-4 px-6 rounded-xl font-semibold",
            "flex items-center justify-center gap-2",
            "transition-all duration-300",
            selectedSchool
              ? `${schoolStyles[selectedSchool].bg} text-white hover:opacity-90 shadow-lg`
              : "bg-muted text-muted-foreground cursor-not-allowed"
          )}
        >
          Continue
          <ArrowRight className="w-5 h-5" />
        </button>

        <p className="text-xs text-muted-foreground mt-6 text-center max-w-sm flex items-center justify-center gap-1">
          <Settings className="w-3 h-3" />
          You may switch disciplines later in Settings.
        </p>
      </div>

      {/* Footer */}
      <div className="py-6 text-center border-t border-border/50">
        <p className="text-xs text-muted-foreground">
          Luminary Innovision Academy (LMV)
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Empowering learners across Law • Business • Health
        </p>
      </div>
    </div>
  );
};

export default WelcomePage;