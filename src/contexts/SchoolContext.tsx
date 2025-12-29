import React, { createContext, useContext, ReactNode } from 'react';
import { useSchool } from '@/hooks/useSchool';
import { LMVSchool, SchoolConfig, DEFAULT_SCHOOL, getSchoolConfig } from '@/config/schools';

interface SchoolContextType {
  school: LMVSchool;
  schoolConfig: SchoolConfig;
  loading: boolean;
  error: string | null;
  updateSchool: (newSchool: LMVSchool) => Promise<boolean>;
  refresh: () => void;
}

const SchoolContext = createContext<SchoolContextType | undefined>(undefined);

interface SchoolProviderProps {
  children: ReactNode;
}

export const SchoolProvider: React.FC<SchoolProviderProps> = ({ children }) => {
  const schoolData = useSchool();

  return (
    <SchoolContext.Provider value={schoolData}>
      {children}
    </SchoolContext.Provider>
  );
};

export function useSchoolContext(): SchoolContextType {
  const context = useContext(SchoolContext);
  if (context === undefined) {
    // Return default values if used outside provider (e.g., on public pages)
    return {
      school: DEFAULT_SCHOOL,
      schoolConfig: getSchoolConfig(DEFAULT_SCHOOL),
      loading: false,
      error: null,
      updateSchool: async () => false,
      refresh: () => {},
    };
  }
  return context;
}
