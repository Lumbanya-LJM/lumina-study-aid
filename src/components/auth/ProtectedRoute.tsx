import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import lmvLogo from '@/assets/lmv-logo.png';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** If true, redirects tutors/admins to their respective dashboards */
  studentOnly?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, studentOnly = false }) => {
  const { user } = useAuth();
  const location = useLocation();
  const { isAdmin, isTutor, loading } = useUserRole();

  if (loading) {
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
  if (studentOnly) {
    if (isAdmin) {
      return <Navigate to="/admin" replace />;
    }
    if (isTutor) {
      return <Navigate to="/teach" replace />;
    }
  }

  return <>{children}</>;
};