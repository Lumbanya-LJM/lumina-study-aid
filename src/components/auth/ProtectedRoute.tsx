import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import lmvLogo from '@/assets/lmv-logo.png';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** If true, redirects tutors/admins to their respective dashboards */
  studentOnly?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, studentOnly = false }) => {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const [roleCheck, setRoleCheck] = useState<{ isAdmin: boolean; isTutor: boolean } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkRoles = async () => {
      if (!user || !studentOnly) {
        setLoading(false);
        return;
      }

      try {
        const [isAdminRes, isTutorRes] = await Promise.all([
          supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' }),
          supabase.rpc('has_role', { _user_id: user.id, _role: 'moderator' }),
        ]);
        setRoleCheck({
          isAdmin: Boolean(isAdminRes.data),
          isTutor: Boolean(isTutorRes.data),
        });
      } catch (error) {
        console.error('Error checking roles:', error);
        setRoleCheck({ isAdmin: false, isTutor: false });
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      checkRoles();
    }
  }, [user, authLoading, studentOnly]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <img 
          src={lmvLogo} 
          alt="Loading..." 
          className="w-16 h-16 object-contain mb-4 animate-pulse"
        />
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-muted-foreground mt-4 text-sm">Loading your session...</p>
      </div>
    );
  }

  if (!user) {
    // Preserve the intended destination for after login
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // If studentOnly and user is admin/tutor, redirect to their dashboard
  if (studentOnly && roleCheck) {
    if (roleCheck.isAdmin) {
      return <Navigate to="/admin" replace />;
    }
    if (roleCheck.isTutor) {
      return <Navigate to="/teach" replace />;
    }
  }

  return <>{children}</>;
};