import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type UserRole = 'admin' | 'tutor' | 'student';

interface UseUserRoleResult {
  role: UserRole | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
  isAdmin: boolean;
  isTutor: boolean;
  isStudent: boolean;
  portalPath: string;
}

export const useUserRole = (): UseUserRoleResult => {
  const { user, loading: authLoading } = useAuth();
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshIndex, setRefreshIndex] = useState(0);

  const refresh = useCallback(() => setRefreshIndex((x) => x + 1), []);

  const checkRoles = useCallback(async () => {
    if (!user) {
      setRole(null);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const maxAttempts = 3;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
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

        setLoading(false);
        return;
      } catch (e) {
        // Retry transient network errors instead of defaulting to "student".
        if (attempt < maxAttempts - 1) {
          await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
          continue;
        }

        console.error('Error checking roles:', e);
        setRole(null);
        setError('Unable to verify your access right now. Please retry.');
        setLoading(false);
      }
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      checkRoles();
    }
  }, [authLoading, checkRoles, refreshIndex]);

  const isAdmin = role === 'admin';
  const isTutor = role === 'tutor' || role === 'admin'; // Admins can access tutor features
  const isStudent = role === 'student';

  const portalPath = isAdmin ? '/admin' : isTutor ? '/teach' : '/home';

  return {
    role,
    loading: authLoading || loading,
    error,
    refresh,
    isAdmin,
    isTutor,
    isStudent,
    portalPath,
  };
};
