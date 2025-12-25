import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { LMVLogo } from '@/components/ui/lmv-logo';
import { Mail, ArrowLeft, CheckCircle, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { z } from 'zod';

const emailSchema = z.string().email("Please enter a valid email address");

const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resending, setResending] = useState(false);

  // Countdown timer for resend button
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const sendResetEmail = useCallback(async (emailAddress: string) => {
    const { error } = await supabase.functions.invoke('request-password-reset', {
      body: { email: emailAddress.trim().toLowerCase() },
    });

    if (error) {
      console.error('Password reset error:', error);
      throw error;
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = emailSchema.safeParse(email.trim());
    if (!validation.success) {
      toast({
        variant: "destructive",
        title: "Invalid Email",
        description: validation.error.issues[0].message,
      });
      return;
    }

    setLoading(true);

    try {
      await sendResetEmail(email);
      setEmailSent(true);
      setResendCooldown(30); // Start 30 second cooldown
      toast({
        title: "Email Sent!",
        description: "If an account exists with this email, you'll receive a reset link.",
      });
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

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    
    setResending(true);
    try {
      await sendResetEmail(email);
      setResendCooldown(30); // Reset cooldown
      toast({
        title: "Email Sent Again!",
        description: "Check your inbox for the reset link.",
      });
    } catch (error) {
      console.error('Resend error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to resend email. Please try again.",
      });
    } finally {
      setResending(false);
    }
  };

  if (emailSent) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="gradient-subtle px-5 md:px-8 pt-12 pb-8 text-center">
          <LMVLogo size="lg" className="justify-center mb-6" />
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Check Your Email</h1>
          <p className="text-muted-foreground text-sm">
            We've sent a password reset link to <strong className="text-foreground">{email}</strong>
          </p>
        </div>

        <div className="flex-1 px-5 md:px-8 py-8 max-w-md mx-auto w-full">
          <div className="p-4 bg-secondary/50 rounded-2xl border border-border/50 mb-6">
            <p className="text-sm text-muted-foreground text-center">
              Didn't receive the email? Check your spam folder or resend below.
            </p>
          </div>

          <button
            onClick={handleResend}
            disabled={resendCooldown > 0 || resending}
            className={cn(
              "w-full py-4 rounded-2xl font-semibold transition-all flex items-center justify-center gap-2 mb-4",
              resendCooldown > 0 || resending
                ? "bg-secondary text-muted-foreground cursor-not-allowed"
                : "text-primary-foreground gradient-primary shadow-glow hover:opacity-90"
            )}
          >
            {resending ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                Sending...
              </>
            ) : resendCooldown > 0 ? (
              <>
                <RefreshCw className="w-5 h-5" />
                Resend in {resendCooldown}s
              </>
            ) : (
              <>
                <RefreshCw className="w-5 h-5" />
                Resend Reset Link
              </>
            )}
          </button>

          <button
            onClick={() => {
              setEmailSent(false);
              setEmail('');
              setResendCooldown(0);
            }}
            className="w-full py-3 rounded-2xl font-medium text-muted-foreground border border-border/50 hover:bg-secondary/50 transition-all mb-4"
          >
            Try a Different Email
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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="gradient-subtle px-5 md:px-8 pt-12 pb-8 text-center">
        <LMVLogo size="lg" className="justify-center mb-6" />
        <h1 className="text-2xl font-bold text-foreground mb-2">Forgot Password?</h1>
        <p className="text-muted-foreground text-sm">
          No worries, we'll send you reset instructions
        </p>
      </div>

      {/* Form */}
      <div className="flex-1 px-5 md:px-8 py-8 max-w-md mx-auto w-full">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                required
                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-secondary border border-border/50 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground placeholder:text-muted-foreground"
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
            {loading ? 'Sending...' : 'Send Reset Link'}
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

export default ForgotPasswordPage;
