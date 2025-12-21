import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LMVLogo } from '@/components/ui/lmv-logo';
import { GraduationCap, BookOpen, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const RoleSelectionPage: React.FC = () => {
  const navigate = useNavigate();

  const roles = [
    {
      id: 'student',
      title: 'Student',
      description: 'Access courses, study materials, quizzes, and connect with tutors',
      icon: GraduationCap,
      color: 'from-primary to-primary/70',
      path: '/auth?role=student'
    },
    {
      id: 'tutor',
      title: 'Tutor',
      description: 'Create courses, post updates, schedule live classes, and teach students',
      icon: BookOpen,
      color: 'from-accent to-accent/70',
      path: '/auth?role=tutor'
    }
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="px-6 py-8">
        <div className="flex items-center gap-2">
          <LMVLogo className="w-8 h-8" />
          <span className="font-bold text-lg text-foreground">Luminary Study</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-foreground mb-3">
            Welcome to Luminary
          </h1>
          <p className="text-muted-foreground max-w-md">
            Choose how you'd like to use Luminary Study
          </p>
        </div>

        <div className="w-full max-w-md space-y-4">
          {roles.map((role) => (
            <button
              key={role.id}
              onClick={() => navigate(role.path)}
              className={cn(
                "w-full p-6 rounded-2xl border border-border/50 bg-card",
                "hover:border-primary/50 hover:bg-card/80 transition-all duration-200",
                "text-left group"
              )}
            >
              <div className="flex items-start gap-4">
                <div className={cn(
                  "p-3 rounded-xl bg-gradient-to-br",
                  role.color
                )}>
                  <role.icon className="w-6 h-6 text-primary-foreground" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-foreground">
                      {role.title}
                    </h3>
                    <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {role.description}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>

        <p className="text-xs text-muted-foreground mt-8 text-center max-w-sm">
          Tutors require admin approval before they can access teaching features
        </p>
      </div>
    </div>
  );
};

export default RoleSelectionPage;
