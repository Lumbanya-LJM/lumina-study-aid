import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type UserRole = 'admin' | 'tutor' | 'student';

interface UseUserRoleResult {
  role: UserRole | null;
  loading: boolean;
  isAdmin: boolean;
  isTutor: boolean;
  isStudent: boolean;
  portalPath: string;
}

export const useUserRole = (): UseUserRoleResult => {
  const { user, loading: authLoading } = useAuth();
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkRoles = async () => {
      if (!user) {
        setRole(null);
        setLoading(false);
        return;
      }

      try {
        const [isAdminRes, isTutorRes] = await Promise.all([
          supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' }),
          supabase.rpc('has_role', { _user_id: user.id, _role: 'moderator' }),
        ]);

        if (isAdminRes.data) {
          setRole('admin');
        } else if (isTutorRes.data) {
          setRole('tutor');
        } else {
          setRole('student');
        }
      } catch (error) {
        console.error('Error checking roles:', error);
        setRole('student'); // Default to student on error
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      checkRoles();
    }
  }, [user, authLoading]);

  const isAdmin = role === 'admin';
  const isTutor = role === 'tutor' || role === 'admin'; // Admins can access tutor features
  const isStudent = role === 'student';

  const portalPath = isAdmin ? '/admin' : isTutor ? '/teach' : '/home';

  return {
    role,
    loading: authLoading || loading,
    isAdmin,
    isTutor,
    isStudent,
    portalPath,
  };
};
