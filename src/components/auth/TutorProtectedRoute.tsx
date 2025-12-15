import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface TutorProtectedRouteProps {
  children: React.ReactNode;
}

export const TutorProtectedRoute: React.FC<TutorProtectedRouteProps> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!isTutor) {
    return <Navigate to="/home" replace />;
  }

  return <>{children}</>;
};
