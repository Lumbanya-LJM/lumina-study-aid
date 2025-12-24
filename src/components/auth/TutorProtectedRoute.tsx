import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import lmvLogo from '@/assets/lmv-logo.png';
import { GraduationCap } from 'lucide-react';

interface TutorProtectedRouteProps {
  children: React.ReactNode;
}

export const TutorProtectedRoute: React.FC<TutorProtectedRouteProps> = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();
  const { isTutor, loading } = useUserRole();

  if (loading) {
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
    return <Navigate to="/auth?role=tutor" state={{ from: location }} replace />;
  }

  if (!isTutor) {
    return <Navigate to="/home" replace />;
  }

  return <>{children}</>;
};
