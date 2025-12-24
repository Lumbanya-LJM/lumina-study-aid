import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Handle auth errors gracefully - clear stale sessions
  const handleAuthError = useCallback((error: AuthError) => {
    console.warn('Auth error detected:', error.code);
    
    // Clear stale session on refresh token errors
    if (
      error.code === 'refresh_token_not_found' ||
      error.code === 'session_not_found' ||
      error.message?.includes('Refresh Token Not Found') ||
      error.message?.includes('Invalid Refresh Token')
    ) {
      console.log('Clearing stale session due to invalid refresh token');
      setSession(null);
      setUser(null);
      // Clear any cached auth data
      localStorage.removeItem('supabase.auth.token');
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        if (!mounted) return;
        
        console.log('Auth state change:', event);
        
        if (event === 'TOKEN_REFRESHED') {
          console.log('Token refreshed successfully');
        }
        
        if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
        } else {
          setSession(currentSession);
          setUser(currentSession?.user ?? null);
        }
        
        setLoading(false);
      }
    );

    // THEN check for existing session with error handling
    const initializeAuth = async () => {
      try {
        const { data: { session: existingSession }, error } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        if (error) {
          handleAuthError(error);
          setLoading(false);
          return;
        }
        
        setSession(existingSession);
        setUser(existingSession?.user ?? null);
        setLoading(false);
      } catch (error) {
        console.error('Session initialization error:', error);
        if (mounted) {
          setSession(null);
          setUser(null);
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen for auth errors globally
    const handleGlobalAuthError = (event: CustomEvent<AuthError>) => {
      handleAuthError(event.detail);
    };
    
    window.addEventListener('supabase.auth.error' as any, handleGlobalAuthError);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      window.removeEventListener('supabase.auth.error' as any, handleGlobalAuthError);
    };
  }, [handleAuthError]);

  const signUp = async (email: string, password: string, fullName: string) => {
    // Use the canonical custom domain for email redirects
    const redirectUrl = 'https://app.lmvacademy.com/home';
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });
    
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    return { error };
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      // Even if signOut fails, clear local state
      console.warn('Sign out error (clearing local state anyway):', error);
    }
    // Always clear local state
    setSession(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};