import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { LMVLogo } from '@/components/ui/lmv-logo';
import { Eye, EyeOff, Mail, Lock, User, GraduationCap, Building } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

const universities = [
  'University of Zambia',
  'Copperbelt University',
  'Mulungushi University',
  'Cavendish University Zambia',
  'University of Lusaka',
  'Zambian Open University',
  'ZCAS University',
  'Northrise University',
  'Zambia Institute of Advanced Legal Education (ZIALE)',
  'Other',
];

const years = [
  { value: 1, label: 'Year 1' },
  { value: 2, label: 'Year 2' },
  { value: 3, label: 'Year 3' },
  { value: 4, label: 'Year 4' },
  { value: 5, label: 'Year 5 (LLM/Masters)' },
];

const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const { signUp, signIn } = useAuth();
  const { toast } = useToast();
  
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'credentials' | 'profile'>('credentials');
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    university: 'University of Zambia',
    customUniversity: '',
    yearOfStudy: 1,
  });

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isLogin) {
      // Login flow
      setLoading(true);
      try {
        const { error } = await signIn(formData.email, formData.password);
        if (error) {
          toast({
            variant: "destructive",
            title: "Login Failed",
            description: error.message === 'Invalid login credentials' 
              ? "Incorrect email or password. Please try again."
              : error.message,
          });
        } else {
          toast({
            title: "Welcome back!",
            description: "You've successfully logged in.",
          });
          navigate('/home');
        }
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Something went wrong. Please try again.",
        });
      } finally {
        setLoading(false);
      }
    } else {
      // Signup flow - move to profile step
      if (formData.password.length < 6) {
        toast({
          variant: "destructive",
          title: "Password Too Short",
          description: "Password must be at least 6 characters long.",
        });
        return;
      }
      setStep('profile');
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await signUp(formData.email, formData.password, formData.fullName);
      
      if (result.error) {
        if (result.error.message.includes('already registered')) {
          toast({
            variant: "destructive",
            title: "Account Exists",
            description: "This email is already registered. Please log in instead.",
          });
          setStep('credentials');
          setIsLogin(true);
        } else {
          toast({
            variant: "destructive",
            title: "Sign Up Failed",
            description: result.error.message,
          });
        }
      } else {
        // Get current user after signup
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        
        if (currentUser) {
          // Update profile with university and year of study
          const { error: profileError } = await supabase
            .from('profiles')
            .update({
              university: formData.university === 'Other' ? formData.customUniversity : formData.university,
              year_of_study: formData.yearOfStudy,
            })
            .eq('user_id', currentUser.id);

          if (profileError) {
            console.error('Profile update error:', profileError);
          }

          // Send welcome email (fire and forget - don't block signup)
          supabase.functions.invoke('send-welcome-email', {
            body: { email: formData.email, fullName: formData.fullName }
          }).then(({ error }) => {
            if (error) console.error('Welcome email error:', error);
          });
        }

        toast({
          title: "Account Created!",
          description: "Welcome to Luminary Study. Check your email for a welcome message!",
        });
        navigate('/home');
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Something went wrong. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const renderCredentialsStep = () => (
    <form onSubmit={handleCredentialsSubmit} className="space-y-4">
      {!isLogin && (
        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">Full Name</label>
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              placeholder="Enter your full name"
              required={!isLogin}
              className="w-full pl-12 pr-4 py-4 rounded-2xl bg-secondary border border-border/50 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground placeholder:text-muted-foreground"
            />
          </div>
        </div>
      )}

      <div>
        <label className="text-sm font-medium text-foreground mb-2 block">Email Address</label>
        <div className="relative">
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="you@example.com"
            required
            className="w-full pl-12 pr-4 py-4 rounded-2xl bg-secondary border border-border/50 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-foreground mb-2 block">Password</label>
        <div className="relative">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type={showPassword ? 'text' : 'password'}
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            placeholder={isLogin ? 'Enter your password' : 'Create a password (min. 6 chars)'}
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

      {isLogin && (
        <div className="text-right">
          <button
            type="button"
            onClick={() => navigate('/forgot-password')}
            className="text-sm text-primary hover:underline"
          >
            Forgot password?
          </button>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className={cn(
          "w-full py-4 rounded-2xl font-semibold text-primary-foreground gradient-primary shadow-glow transition-all",
          loading ? "opacity-70 cursor-not-allowed" : "hover:opacity-90"
        )}
      >
        {loading ? 'Please wait...' : isLogin ? 'Sign In' : 'Continue'}
      </button>
    </form>
  );

  const renderProfileStep = () => (
    <form onSubmit={handleProfileSubmit} className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-foreground">Complete Your Profile</h2>
        <p className="text-sm text-muted-foreground mt-1">Tell us about your studies</p>
      </div>

      <div>
        <label className="text-sm font-medium text-foreground mb-2 block">University</label>
        <div className="relative">
          <Building className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <select
            value={formData.university}
            onChange={(e) => setFormData({ ...formData, university: e.target.value })}
            className="w-full pl-12 pr-4 py-4 rounded-2xl bg-secondary border border-border/50 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground appearance-none"
          >
            {universities.map((uni) => (
              <option key={uni} value={uni}>{uni}</option>
            ))}
          </select>
        </div>
        {formData.university === 'Other' && (
          <div className="relative mt-2">
            <Building className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              value={formData.customUniversity}
              onChange={(e) => setFormData({ ...formData, customUniversity: e.target.value })}
              placeholder="Enter your university name"
              required
              className="w-full pl-12 pr-4 py-4 rounded-2xl bg-secondary border border-border/50 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground placeholder:text-muted-foreground"
            />
          </div>
        )}
      </div>

      <div>
        <label className="text-sm font-medium text-foreground mb-2 block">Year of Study</label>
        <div className="relative">
          <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <select
            value={formData.yearOfStudy}
            onChange={(e) => setFormData({ ...formData, yearOfStudy: parseInt(e.target.value) })}
            className="w-full pl-12 pr-4 py-4 rounded-2xl bg-secondary border border-border/50 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground appearance-none"
          >
            {years.map((year) => (
              <option key={year.value} value={year.value}>{year.label}</option>
            ))}
          </select>
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
        {loading ? 'Creating Account...' : 'Create Account'}
      </button>

      <button
        type="button"
        onClick={() => setStep('credentials')}
        className="w-full py-3 text-primary font-medium hover:underline"
      >
        Go Back
      </button>
    </form>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="gradient-subtle px-5 md:px-8 pt-12 pb-8 text-center">
        <LMVLogo size="lg" className="justify-center mb-6" />
        <h1 className="text-2xl font-bold text-foreground mb-2">
          {step === 'profile' ? 'Almost There!' : isLogin ? 'Welcome Back' : 'Join Luminary'}
        </h1>
        <p className="text-muted-foreground text-sm">
          {step === 'profile' 
            ? 'Just a few more details to personalize your experience'
            : isLogin 
              ? 'Sign in to continue your studies' 
              : 'Create your account to start excelling'}
        </p>
      </div>

      {/* Form */}
      <div className="flex-1 px-5 md:px-8 py-8 max-w-md mx-auto w-full">
        {step === 'credentials' ? renderCredentialsStep() : renderProfileStep()}

        {/* Toggle */}
        {step === 'credentials' && (
          <div className="mt-6 text-center">
            <p className="text-muted-foreground text-sm">
              {isLogin ? "Don't have an account?" : "Already have an account?"}
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-primary font-semibold ml-1 hover:underline"
              >
                {isLogin ? 'Sign Up' : 'Sign In'}
              </button>
            </p>
          </div>
        )}

        {/* Tagline */}
        <div className="mt-8 p-4 bg-primary/5 rounded-2xl border border-primary/10">
          <p className="text-xs text-center text-muted-foreground">
            🇿🇲 An app designed to enhance learning through modern learning methods
          </p>
          <p className="text-[10px] text-center text-muted-foreground/70 mt-1">
            Covering Zambian case law, statutes, and the Constitution of Zambia
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
