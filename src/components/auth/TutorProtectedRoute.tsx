import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import lmvLogo from '@/assets/lmv-logo.png';
import { GraduationCap } from 'lucide-react';

interface TutorProtectedRouteProps {
  children: React.ReactNode;
}

export const TutorProtectedRoute: React.FC<TutorProtectedRouteProps> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const [isTutor, setIsTutor] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkTutorRole = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .in('role', ['admin', 'moderator']);

        if (error) throw error;
        setIsTutor(data && data.length > 0);
      } catch (error) {
        console.error('Error checking tutor role:', error);
        setIsTutor(false);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      checkTutorRole();
    }
  }, [user, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <img 
          src={lmvLogo} 
          alt="Loading..." 
          className="w-16 h-16 object-contain mb-4 animate-pulse"
        />
        <div className="flex items-center gap-2 text-primary mb-4">
          <GraduationCap className="w-5 h-5" />
          <span className="font-semibold">Luminary Teach</span>
        </div>
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-muted-foreground mt-4 text-sm">Verifying tutor access...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (!isTutor) {
    return <Navigate to="/home" replace />;
  }

  return <>{children}</>;
};
