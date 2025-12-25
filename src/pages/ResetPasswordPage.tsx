import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { LMVLogo } from '@/components/ui/lmv-logo';
import { Lock, Eye, EyeOff, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { z } from 'zod';

const passwordSchema = z.string().min(6, "Password must be at least 6 characters");

const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isValidToken, setIsValidToken] = useState(false);
  const [checkingToken, setCheckingToken] = useState(true);
  const [tokenError, setTokenError] = useState<string | null>(null);

  // Get token from URL query params (custom flow)
  const customToken = searchParams.get('token');

  useEffect(() => {
    // Check for custom token first
    if (customToken) {
      setIsValidToken(true);
      setCheckingToken(false);
      return;
    }

    // Fallback: Check for Supabase's built-in recovery flow (URL hash)
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    const type = hashParams.get('type');
    
    if (accessToken && type === 'recovery') {
      setIsValidToken(true);
      setCheckingToken(false);
      return;
    }

    // Check for existing session (user might already be authenticated via recovery link)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setIsValidToken(true);
      } else {
        setTokenError('No valid reset token found');
      }
      setCheckingToken(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        setIsValidToken(true);
        setCheckingToken(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [customToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate password
    const validation = passwordSchema.safeParse(password);
    if (!validation.success) {
      toast({
        variant: "destructive",
        title: "Invalid Password",
        description: validation.error.issues[0].message,
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Passwords Don't Match",
        description: "Please make sure both passwords are the same.",
      });
      return;
    }

    setLoading(true);

    try {
      // Use custom flow if we have a custom token
      if (customToken) {
        const { data, error } = await supabase.functions.invoke('reset-password', {
          body: { token: customToken, newPassword: password },
        });

        if (error) {
          console.error('Password reset error:', error);
          toast({
            variant: "destructive",
            title: "Reset Failed",
            description: "Something went wrong. Please try again.",
          });
        } else if (data?.error) {
          toast({
            variant: "destructive",
            title: "Reset Failed",
            description: data.error,
          });
        } else {
          setSuccess(true);
          toast({
            title: "Password Updated!",
            description: "Your password has been successfully reset.",
          });
        }
      } else {
        // Fallback to Supabase's built-in password update
        const { error } = await supabase.auth.updateUser({ password });

        if (error) {
          toast({
            variant: "destructive",
            title: "Reset Failed",
            description: error.message,
          });
        } else {
          setSuccess(true);
          toast({
            title: "Password Updated!",
            description: "Your password has been successfully reset.",
          });
        }
      }
    } catch (error) {
      console.error('Password reset error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Something went wrong. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  if (checkingToken) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isValidToken || tokenError) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="gradient-subtle px-5 md:px-8 pt-12 pb-8 text-center">
          <LMVLogo size="lg" className="justify-center mb-6" />
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/20 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Invalid Link</h1>
          <p className="text-muted-foreground text-sm">
            This password reset link is invalid or has expired.
          </p>
        </div>
        <div className="flex-1 px-5 md:px-8 py-8 max-w-md mx-auto w-full">
          <button
            onClick={() => navigate('/forgot-password')}
            className="w-full py-4 rounded-2xl font-semibold text-primary-foreground gradient-primary shadow-glow hover:opacity-90 transition-all mb-4"
          >
            Request New Reset Link
          </button>
          <button
            onClick={() => navigate('/auth')}
            className="flex items-center justify-center gap-2 w-full py-3 text-primary font-medium hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="gradient-subtle px-5 md:px-8 pt-12 pb-8 text-center">
          <LMVLogo size="lg" className="justify-center mb-6" />
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Password Reset!</h1>
          <p className="text-muted-foreground text-sm">
            Your password has been successfully updated.
          </p>
        </div>
        <div className="flex-1 px-5 md:px-8 py-8 max-w-md mx-auto w-full">
          <button
            onClick={() => navigate('/auth')}
            className="w-full py-4 rounded-2xl font-semibold text-primary-foreground gradient-primary shadow-glow hover:opacity-90 transition-all"
          >
            Continue to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="gradient-subtle px-5 md:px-8 pt-12 pb-8 text-center">
        <LMVLogo size="lg" className="justify-center mb-6" />
        <h1 className="text-2xl font-bold text-foreground mb-2">Set New Password</h1>
        <p className="text-muted-foreground text-sm">
          Create a strong password for your account
        </p>
      </div>

      {/* Form */}
      <div className="flex-1 px-5 md:px-8 py-8 max-w-md mx-auto w-full">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">New Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password (min. 6 chars)"
                required
                minLength={6}
                className="w-full pl-12 pr-12 py-4 rounded-2xl bg-secondary border border-border/50 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground placeholder:text-muted-foreground"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Confirm Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your new password"
                required
                minLength={6}
                className="w-full pl-12 pr-12 py-4 rounded-2xl bg-secondary border border-border/50 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={cn(
              "w-full py-4 rounded-2xl font-semibold text-primary-foreground gradient-primary shadow-glow transition-all",
              loading ? "opacity-70 cursor-not-allowed" : "hover:opacity-90"
            )}
          >
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>

        <button
          onClick={() => navigate('/auth')}
          className="mt-6 flex items-center justify-center gap-2 w-full py-3 text-primary font-medium hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Login
        </button>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
