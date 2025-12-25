import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { LMVLogo } from '@/components/ui/lmv-logo';
import { Eye, EyeOff, Mail, Lock, Shield, ArrowLeft, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

const AdminAuthPage: React.FC = () => {
  const navigate = useNavigate();
  const { signIn, user } = useAuth();
  const { toast } = useToast();

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  // If already logged in, check if admin and redirect
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (user) {
        const { data: isAdmin } = await supabase.rpc('has_role', { 
          _user_id: user.id, 
          _role: 'admin' 
        });
        
        if (isAdmin) {
          navigate('/admin', { replace: true });
        } else {
          toast({
            variant: 'destructive',
            title: 'Access Denied',
            description: 'You do not have admin privileges.',
          });
          await supabase.auth.signOut();
        }
      }
    };
    
    checkAdminStatus();
  }, [user, navigate, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await signIn(formData.email, formData.password);
      
      if (error) {
        toast({
          variant: 'destructive',
          title: 'Login Failed',
          description: error.message === 'Invalid login credentials'
            ? 'Incorrect email or password.'
            : error.message,
        });
        setLoading(false);
        return;
      }

      // Get the logged in user
      const { data: { user: loggedInUser } } = await supabase.auth.getUser();
      
      if (!loggedInUser) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Could not verify user.',
        });
        setLoading(false);
        return;
      }

      // Check if user has admin role
      const { data: isAdmin } = await supabase.rpc('has_role', { 
        _user_id: loggedInUser.id, 
        _role: 'admin' 
      });

      if (!isAdmin) {
        await supabase.auth.signOut();
        toast({
          variant: 'destructive',
          title: 'Access Denied',
          description: 'This portal is for administrators only.',
        });
        setLoading(false);
        return;
      }

      toast({
        title: 'Welcome, Admin!',
        description: 'Redirecting to admin dashboard.',
      });

      navigate('/admin', { replace: true });
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Something went wrong. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex flex-col">
      {/* Header */}
      <div className="px-5 pt-6">
        <button
          onClick={() => navigate('/auth')}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Back to Login</span>
        </button>
      </div>

      {/* Logo and Title */}
      <div className="flex flex-col items-center pt-12 pb-8 px-5">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-glow mb-4">
          <Shield className="w-10 h-10 text-primary-foreground" />
        </div>
        <div className="flex items-center gap-2 mb-2">
          <LMVLogo className="w-8 h-8" />
          <span className="text-xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
            Admin Portal
          </span>
        </div>
        <p className="text-muted-foreground text-sm text-center">
          Secure access for administrators only
        </p>
      </div>

      {/* Form */}
      <div className="flex-1 px-5 md:px-8 py-8 max-w-md mx-auto w-full">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Admin Email
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="admin@lmvacademy.com"
                required
                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-secondary border border-border/50 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Enter your password"
                required
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

          <button
            type="submit"
            disabled={loading}
            className={cn(
              "w-full py-4 rounded-2xl font-semibold text-primary-foreground gradient-primary shadow-glow transition-all flex items-center justify-center gap-2",
              loading ? "opacity-70 cursor-not-allowed" : "hover:opacity-90"
            )}
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <Shield className="w-5 h-5" />
                Access Admin Dashboard
              </>
            )}
          </button>
        </form>

        {/* Security Notice */}
        <div className="mt-8 p-4 bg-destructive/5 rounded-2xl border border-destructive/10">
          <p className="text-xs text-center text-muted-foreground">
            🔒 This portal requires admin privileges. Unauthorized access attempts are logged.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminAuthPage;
