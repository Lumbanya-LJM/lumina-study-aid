import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { LMVSchool, getSchoolConfig, SchoolConfig, DEFAULT_SCHOOL } from '@/config/schools';

interface UseSchoolResult {
  school: LMVSchool;
  schoolConfig: SchoolConfig;
  loading: boolean;
  error: string | null;
  updateSchool: (newSchool: LMVSchool) => Promise<boolean>;
  refresh: () => void;
}

export function useSchool(): UseSchoolResult {
  const { user } = useAuth();
  const [school, setSchool] = useState<LMVSchool>(DEFAULT_SCHOOL);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshIndex, setRefreshIndex] = useState(0);

  const fetchSchool = useCallback(async () => {
    if (!user) {
      setSchool(DEFAULT_SCHOOL);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('school')
        .eq('user_id', user.id)
        .single();

      if (fetchError) {
        console.error('Error fetching school:', fetchError);
        setError('Failed to load school preference');
        setSchool(DEFAULT_SCHOOL);
      } else {
        // Handle the school value - it could be null, undefined, or a valid value
        const schoolValue = data?.school as LMVSchool | null;
        setSchool(schoolValue || DEFAULT_SCHOOL);
      }
    } catch (err) {
      console.error('Unexpected error fetching school:', err);
      setError('An unexpected error occurred');
      setSchool(DEFAULT_SCHOOL);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSchool();
  }, [fetchSchool, refreshIndex]);

  const updateSchool = async (newSchool: LMVSchool): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ school: newSchool })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Error updating school:', updateError);
        setError('Failed to update school');
        return false;
      }

      setSchool(newSchool);
      return true;
    } catch (err) {
      console.error('Unexpected error updating school:', err);
      setError('An unexpected error occurred');
      return false;
    }
  };

  const refresh = () => setRefreshIndex((i) => i + 1);

  return {
    school,
    schoolConfig: getSchoolConfig(school),
    loading,
    error,
    updateSchool,
    refresh,
  };
}
