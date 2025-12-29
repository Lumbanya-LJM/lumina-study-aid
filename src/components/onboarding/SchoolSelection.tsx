import React from 'react';
import { Scale, Briefcase, Heart, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LMVSchool, SCHOOL_CONFIGS } from '@/config/schools';

interface SchoolSelectionProps {
  selectedSchool: LMVSchool | null;
  onSelect: (school: LMVSchool) => void;
  className?: string;
}

const schoolIcons: Record<LMVSchool, React.ReactNode> = {
  law: <Scale className="w-8 h-8" />,
  business: <Briefcase className="w-8 h-8" />,
  health: <Heart className="w-8 h-8" />,
};

// School-specific color classes
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

export const SchoolSelection: React.FC<SchoolSelectionProps> = ({
  selectedSchool,
  onSelect,
  className,
}) => {
  const schools = Object.values(SCHOOL_CONFIGS);

  return (
    <div className={cn("space-y-4", className)}>
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Select Your School
        </h3>
        <p className="text-sm text-muted-foreground">
          Choose the academic division that matches your programme of study
        </p>
      </div>

      <div className="grid gap-4">
        {schools.map((school) => {
          const isSelected = selectedSchool === school.id;
          const styles = schoolStyles[school.id];
          
          return (
            <button
              key={school.id}
              onClick={() => onSelect(school.id)}
              type="button"
              className={cn(
                "w-full p-5 rounded-xl border-2 text-left transition-all duration-200",
                "hover:shadow-md",
                isSelected
                  ? `${styles.border} bg-primary/5 shadow-md`
                  : "border-border/50 bg-card hover:bg-card/80 hover:border-muted-foreground/30"
              )}
            >
              <div className="flex items-start gap-4">
                <div
                  className={cn(
                    "p-3 rounded-xl transition-colors",
                    isSelected
                      ? styles.icon
                      : "bg-secondary text-secondary-foreground"
                  )}
                >
                  {schoolIcons[school.id]}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-base font-semibold text-foreground">
                      {school.name}
                    </h4>
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
    </div>
  );
};

export default SchoolSelection;