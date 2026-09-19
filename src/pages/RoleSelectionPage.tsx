import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { LMVLogo } from '@/components/ui/lmv-logo';
import { GraduationCap, BookOpen, LogIn, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const RoleSelectionPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const storedSchool = (() => {
    try {
      return searchParams.get('school') || localStorage.getItem('lmv_selected_school');
    } catch {
      return null;
    }
  })();

  const withSchool = (path: string) => {
    if (!storedSchool) return path;
    const url = new URL(path, window.location.origin);
    url.searchParams.set('school', storedSchool);
    return url.pathname + url.search;
  };

  const roles = [
    {
      id: 'student',
      title: 'Student',
      description: 'Access courses, study materials, quizzes, and connect with tutors',
      icon: GraduationCap,
      color: 'from-primary to-primary/70',
      signInPath: withSchool('/student/login'),
      signUpPath: withSchool('/student/signup'),
    },
    {
      id: 'tutor',
      title: 'Tutor',
      description: 'Create courses, post updates, schedule live classes, and teach students',
      icon: BookOpen,
      color: 'from-accent to-accent/70',
      signInPath: withSchool('/teach/login'),
      signUpPath: withSchool('/teach/signup'),
    },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="px-6 py-8">
        <LMVLogo size="sm" variant="full" />
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
            <section
              key={role.id}
              className={cn(
                "w-full p-6 rounded-lg border border-border/50 bg-card",
                "transition-colors duration-200"
              )}
            >
              <div className="flex items-start gap-4">
                <div className={cn(
                  "p-3 rounded-xl bg-gradient-to-br",
                  role.color
                )}>
                  <role.icon className="w-6 h-6 text-primary-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-semibold text-foreground">
                    {role.title}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {role.description}
                  </p>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => navigate(role.signInPath)}
                >
                  <LogIn className="h-4 w-4 shrink-0" />
                  Sign In
                </Button>
                <Button
                  type="button"
                  className="w-full gap-2"
                  onClick={() => navigate(role.signUpPath)}
                >
                  <UserPlus className="h-4 w-4 shrink-0" />
                  Sign Up
                </Button>
              </div>
            </section>
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
