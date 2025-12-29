import { useEffect } from 'react';
import { useSchoolContext } from '@/contexts/SchoolContext';
import { LMVSchool, getSchoolConfig } from '@/config/schools';

/**
 * Hook to apply school-specific theme class to the document body
 * This enables school-specific color theming throughout the app
 */
export function useSchoolTheme() {
  const { school } = useSchoolContext();

  useEffect(() => {
    applySchoolTheme(school);
    
    return () => {
      // Cleanup all school theme classes on unmount
      document.documentElement.classList.remove('school-law', 'school-business', 'school-health');
    };
  }, [school]);

  return { school, themeClass: getSchoolConfig(school).themeClass };
}

/**
 * Apply school theme without the hook (for use in auth pages before context is available)
 */
export function applySchoolTheme(school: LMVSchool) {
  const themeClasses = ['school-law', 'school-business', 'school-health'];
  const newThemeClass = getSchoolConfig(school).themeClass;
  
  // Remove all school theme classes first
  themeClasses.forEach((cls) => {
    document.documentElement.classList.remove(cls);
  });
  
  // Apply the new school theme class
  document.documentElement.classList.add(newThemeClass);
}

/**
 * Get school theme from localStorage (for use during auth flow)
 */
export function getStoredSchool(): LMVSchool {
  const stored = localStorage.getItem('lmv_selected_school');
  if (stored && ['law', 'business', 'health'].includes(stored)) {
    return stored as LMVSchool;
  }
  return 'law';
}