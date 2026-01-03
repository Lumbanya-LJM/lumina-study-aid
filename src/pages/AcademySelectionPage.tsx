import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { ArrowLeft, GraduationCap, ShoppingCart, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const AcademySelectionPage: React.FC = () => {
  const navigate = useNavigate();

  const options = [
    {
      id: 'dashboard',
      title: 'Academy Dashboard',
      description: 'Access your enrolled courses, live classes, recordings, and materials',
      icon: GraduationCap,
      color: 'from-primary to-primary/70',
      path: '/academy/dashboard',
    },
    {
      id: 'marketplace',
      title: 'Class Marketplace',
      description: 'Browse and purchase individual live classes or recordings',
      icon: ShoppingCart,
      color: 'from-accent to-accent/70',
      path: '/marketplace',
    },
  ];

  return (
    <MobileLayout showNav={true}>
      <div className="flex flex-col min-h-screen py-6 safe-top">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button 
            onClick={() => navigate(-1)} 
            className="p-2 rounded-xl hover:bg-secondary transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-foreground">Lumina Academy</h1>
            <p className="text-sm text-muted-foreground">Choose where you want to go</p>
          </div>
        </div>

        {/* Options */}
        <div className="flex-1 flex flex-col justify-center px-2">
          <div className="space-y-4 max-w-md mx-auto w-full">
            {options.map((option) => (
              <button
                key={option.id}
                onClick={() => navigate(option.path)}
                className={cn(
                  "w-full p-6 rounded-2xl border border-border/50 bg-card",
                  "hover:border-primary/50 hover:bg-card/80 transition-all duration-200",
                  "text-left group"
                )}
              >
                <div className="flex items-start gap-4">
                  <div className={cn(
                    "p-3 rounded-xl bg-gradient-to-br",
                    option.color
                  )}>
                    <option.icon className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-foreground">
                        {option.title}
                      </h3>
                      <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {option.description}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </MobileLayout>
  );
};

export default AcademySelectionPage;
