import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { LMVLogo } from '@/components/ui/lmv-logo';
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  GraduationCap,
  Building,
  BookOpen,
  Check,
  Loader2,
  ArrowLeft,
  ChevronLeft,
  Award,
  Scale,
  Briefcase,
  Heart,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { Checkbox } from '@/components/ui/checkbox';
import TutorApplicationForm from '@/components/auth/TutorApplicationForm';
import { Button } from '@/components/ui/button';
import { LMVSchool, SCHOOL_CONFIGS, getSchoolConfig } from '@/config/schools';
import SchoolSelection from '@/components/onboarding/SchoolSelection';
import { applySchoolTheme, getStoredSchool } from '@/hooks/useSchoolTheme';

// Dynamic universities based on school
const getUniversitiesForSchool = (school: LMVSchool) => {
  return getSchoolConfig(school).universities;
};

const universityYears = [
  { value: 1, label: 'Year 1' },
  { value: 2, label: 'Year 2' },
  { value: 3, label: 'Year 3' },
  { value: 4, label: 'Year 4' },
  { value: 5, label: 'Year 5 (LLM/Masters)' },
];

const zialeOptions = [
  { value: 1, label: 'First Attempt' },
  { value: 2, label: 'Repeater' },
];

interface Course {
  id: string;
  name: string;
  description: string | null;
  institution: string | null;
}

const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialRole = searchParams.get('role') || 'student';
  const invitationToken = searchParams.get('invitation');
  const schoolParam = (searchParams.get('school') as LMVSchool | null) ?? null;
  const { signUp, signIn } = useAuth();
  const { toast } = useToast();

  const [isLogin, setIsLogin] = useState(!invitationToken);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'credentials' | 'school' | 'profile' | 'courses' | 'tutor-application'>('credentials');
  const [courses, setCourses] = useState<Course[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [newUserId, setNewUserId] = useState<string | null>(null);
  const [selectedSchool, setSelectedSchool] = useState<LMVSchool>(() => getStoredSchool());
  const [selectedRole, setSelectedRole] = useState<'student' | 'tutor'>(
    invitationToken ? 'tutor' : (initialRole as 'student' | 'tutor')
  );
  const [invitation, setInvitation] = useState<{
    id: string;
    email: string;
    full_name: string | null;
    selected_courses: string[];
  } | null>(null);
  const [loadingInvitation, setLoadingInvitation] = useState(!!invitationToken);

  const hasPresetSchool = (() => {
    try {
      return Boolean(schoolParam || localStorage.getItem('lmv_selected_school'));
    } catch {
      return Boolean(schoolParam);
    }
  })();

  // If school is provided in the URL, treat it as the source of truth for this session
  useEffect(() => {
    if (schoolParam) {
      setSelectedSchool(schoolParam);
      try {
        localStorage.setItem('lmv_selected_school', schoolParam);
      } catch {
        // ignore
      }
    }
  }, [schoolParam]);

  // Apply school theme on mount and when selection changes
  useEffect(() => {
    applySchoolTheme(selectedSchool);
  }, [selectedSchool]);

  // Load invitation details if token is present
  useEffect(() => {
    if (invitationToken) {
      loadInvitation(invitationToken);
    }
  }, [invitationToken]);

  const loadInvitation = async (token: string) => {
    setLoadingInvitation(true);
    try {
      const { data, error } = await supabase
        .from('tutor_invitations')
        .select('id, email, full_name, selected_courses, status, expires_at')
        .eq('invitation_token', token)
        .single();

      if (error || !data) {
        toast({
          variant: 'destructive',
          title: 'Invalid Invitation',
          description: 'This invitation link is invalid or has expired.',
        });
        setSearchParams({});
        return;
      }

      if (data.status !== 'pending') {
        toast({
          variant: 'destructive',
          title: 'Invitation Already Used',
          description: 'This invitation has already been accepted or cancelled.',
        });
        setSearchParams({});
        return;
      }

      if (new Date(data.expires_at) < new Date()) {
        toast({
          variant: 'destructive',
          title: 'Invitation Expired',
          description: 'This invitation has expired. Please contact the admin for a new one.',
        });
        setSearchParams({});
        return;
      }

      setInvitation({
        id: data.id,
        email: data.email,
        full_name: data.full_name,
        selected_courses: data.selected_courses || [],
      });
      setFormData(prev => ({
        ...prev,
        email: data.email,
        fullName: data.full_name || '',
      }));
      setIsLogin(false);
      setSelectedRole('tutor');
    } catch (error) {
      console.error('Error loading invitation:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load invitation details.',
      });
    } finally {
      setLoadingInvitation(false);
    }
  };

  // Update URL when role changes (preserve existing params like school/invitation)
  const handleRoleChange = (role: 'student' | 'tutor') => {
    if (invitation) return; // Don't allow changing role if invited
    setSelectedRole(role);

    const next = new URLSearchParams(searchParams);
    next.set('role', role);
    setSearchParams(next);
  };

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    university: 'University of Zambia',
    customUniversity: '',
    yearOfStudy: 1,
    selectedCourses: [] as string[],
    agreePrivacyPolicy: false,
    agreeDataConsent: false,
  });

  const resolvePortalPath = async (userId: string) => {
    // Use the backend role-check function (more reliable than selecting user_roles under RLS)
    const [isAdminRes, isTutorRes] = await Promise.all([
      supabase.rpc('has_role', { _user_id: userId, _role: 'admin' }),
      supabase.rpc('has_role', { _user_id: userId, _role: 'moderator' }),
    ]);

    if (isAdminRes.data) return '/admin';
    if (isTutorRes.data) return '/teach';
    return '/home';
  };

  // Load available courses when reaching the courses step (filtered by school and institution)
  useEffect(() => {
    if (step === 'courses') {
      loadCourses();
    }
  }, [step, formData.university, selectedSchool]);

  const loadCourses = async () => {
    setLoadingCourses(true);
    try {
      // Determine which institution to filter by
      const isZiale = formData.university === 'Zambia Institute of Advanced Legal Education (ZIALE)';
      const isZicpa = formData.university === 'Zambia Centre for Accountancy Studies (ZCAS)';
      const institutionFilter = isZiale ? 'ZIALE' : isZicpa ? 'ZICPA' : 'University';
      
      const { data, error } = await supabase
        .from('academy_courses')
        .select('id, name, description, institution, school')
        .eq('is_active', true)
        .eq('school', selectedSchool)
        .eq('institution', institutionFilter)
        .order('name');

      if (error) throw error;
      setCourses(data || []);
      // Clear previously selected courses when institution changes
      setFormData(prev => ({ ...prev, selectedCourses: [] }));
    } catch (error) {
      console.error('Error loading courses:', error);
    } finally {
      setLoadingCourses(false);
    }
  };

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isLogin) {
      // Login flow
      setLoading(true);
      try {
        const { error } = await signIn(formData.email, formData.password);
        if (error) {
          toast({
            variant: 'destructive',
            title: 'Login Failed',
            description:
              error.message === 'Invalid login credentials'
                ? 'Incorrect email or password. Please try again.'
                : error.message,
          });
        } else {
          const { data: { user } } = await supabase.auth.getUser();

          // If user attempted to visit a page before login, honor it first.
          // TutorProtectedRoute/ProtectedRoute will still enforce permissions.
          const fromPath = (location.state as any)?.from?.pathname as string | undefined;
          if (fromPath && fromPath !== '/auth' && fromPath !== '/welcome' && fromPath !== '/') {
            navigate(fromPath, { replace: true });
            return;
          }

          if (user) {
            const path = await resolvePortalPath(user.id);

            toast({
              title:
                path === '/admin'
                  ? 'Welcome, Admin!'
                  : path === '/teach'
                    ? 'Welcome, Tutor!'
                    : 'Welcome!',
              description:
                path === '/admin'
                  ? 'Redirecting to admin dashboard.'
                  : path === '/teach'
                    ? 'Redirecting to your teaching dashboard.'
                    : "You've successfully logged in.",
            });

            navigate(path, { replace: true });
            return;
          }

          // Fallback
          navigate('/home', { replace: true });
        }
      } catch {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Something went wrong. Please try again.',
        });
      } finally {
        setLoading(false);
      }
    } else {
      // Signup flow - move to profile step
      if (formData.password.length < 6) {
        toast({
          variant: 'destructive',
          title: 'Password Too Short',
          description: 'Password must be at least 6 characters long.',
        });
        return;
      }
      // For invited tutors, create account and grant tutor role directly
      if (invitation) {
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
            const { data: { user: currentUser } } = await supabase.auth.getUser();
            
            if (currentUser) {
              // Add moderator role for invited tutor
              const { error: roleError } = await supabase
                .from('user_roles')
                .insert({ user_id: currentUser.id, role: 'moderator' });

              if (roleError) {
                console.error('Error adding tutor role:', roleError);
              }

              // Create tutor application record (pre-approved)
              const { error: appError } = await supabase
                .from('tutor_applications')
                .insert({
                  user_id: currentUser.id,
                  email: formData.email,
                  full_name: formData.fullName,
                  selected_courses: invitation.selected_courses,
                  status: 'approved',
                  reviewed_at: new Date().toISOString(),
                });

              if (appError) {
                console.error('Error creating tutor application:', appError);
              }

              // Update invitation status
              await supabase
                .from('tutor_invitations')
                .update({ 
                  status: 'accepted', 
                  accepted_at: new Date().toISOString(),
                  user_id: currentUser.id 
                })
                .eq('id', invitation.id);

              localStorage.removeItem('luminary_tutor_onboarding_complete');
              
              toast({
                title: "Welcome, Tutor!",
                description: "Your account has been created. Redirecting to your dashboard.",
              });

              navigate('/teach', { replace: true });
            }
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
        return;
      }

      // For regular tutor applications, skip profile and courses step, go directly to account creation then application
      if (selectedRole === 'tutor') {
        // Create the account and go to tutor application
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
            const { data: { user: currentUser } } = await supabase.auth.getUser();
            
            if (currentUser) {
              setNewUserId(currentUser.id);
              localStorage.removeItem('luminary_tutor_onboarding_complete');
              setStep('tutor-application');
            }
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
        // Student signup: only ask for school if it hasn't been chosen yet
        setStep(hasPresetSchool ? 'profile' : 'school');
      }
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Move to course selection step
    setStep('courses');
  };

  const handleCoursesSubmit = async (e: React.FormEvent) => {
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
          setNewUserId(currentUser.id);
          
          // Update profile with university, year of study, and school
          const { error: profileError } = await supabase
            .from('profiles')
            .update({
              university: formData.university === 'Other' ? formData.customUniversity : formData.university,
              year_of_study: formData.yearOfStudy,
              school: selectedSchool,
            })
            .eq('user_id', currentUser.id);

          if (profileError) {
            console.error('Profile update error:', profileError);
          }

          // Enroll in selected courses
          if (formData.selectedCourses.length > 0) {
            const enrollments = formData.selectedCourses.map(courseId => ({
              user_id: currentUser.id,
              course_id: courseId,
              status: 'active',
            }));

            const { error: enrollmentError } = await supabase
              .from('academy_enrollments')
              .insert(enrollments);

            if (enrollmentError) {
              console.error('Enrollment error:', enrollmentError);
            }
          }

          // Send welcome email with school-specific branding (fire and forget - don't block signup)
          supabase.functions.invoke('send-welcome-email', {
            body: { email: formData.email, fullName: formData.fullName, school: selectedSchool }
          }).then(({ error }) => {
            if (error) console.error('Welcome email error:', error);
          });

          // Clear the appropriate onboarding flag based on role
          if (selectedRole === 'tutor') {
            localStorage.removeItem('luminary_tutor_onboarding_complete');
          } else {
            localStorage.removeItem('luminary_onboarding_complete');
          }

          // If tutor role selected, show application form
          if (selectedRole === 'tutor') {
            setStep('tutor-application');
            setLoading(false);
            return;
          }
        }

        toast({
          title: "Account Created!",
          description: formData.selectedCourses.length > 0 
            ? `Welcome! You've enrolled in ${formData.selectedCourses.length} course(s).`
            : "Welcome to Luminary Study!",
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

  const [showApplicationSuccess, setShowApplicationSuccess] = useState(false);

  const handleTutorApplicationSuccess = () => {
    setShowApplicationSuccess(true);
  };

  const handleReturnToAuth = async () => {
    // Sign out the user so they can log back in after approval
    await supabase.auth.signOut();
    setShowApplicationSuccess(false);
    setStep('credentials');
    setIsLogin(true);
    setFormData({
      fullName: '',
      email: '',
      password: '',
      university: 'University of Zambia',
      customUniversity: '',
      yearOfStudy: 1,
      selectedCourses: [],
      agreePrivacyPolicy: false,
      agreeDataConsent: false,
    });
    setNewUserId(null);
  };

  const toggleCourse = (courseId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedCourses: prev.selectedCourses.includes(courseId)
        ? prev.selectedCourses.filter(id => id !== courseId)
        : [...prev.selectedCourses, courseId]
    }));
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
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            aria-pressed={showPassword}
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

      <Button
        type="submit"
        loading={loading}
        className="w-full py-4 rounded-2xl font-semibold text-primary-foreground gradient-primary shadow-glow transition-all"
      >
        {isLogin ? 'Sign In' : 'Continue'}
      </Button>
    </form>
  );

  const renderSchoolStep = () => (
    <div className="space-y-6">
      <SchoolSelection
        selectedSchool={selectedSchool}
        onSelect={setSelectedSchool}
      />
      
      <button
        type="button"
        onClick={() => setStep('profile')}
        disabled={!selectedSchool}
        className={cn(
          "w-full py-4 rounded-2xl font-semibold text-primary-foreground gradient-primary shadow-glow transition-all",
          !selectedSchool ? "opacity-70 cursor-not-allowed" : "hover:opacity-90"
        )}
      >
        Continue
      </button>

      <button
        type="button"
        onClick={() => setStep('credentials')}
        className="w-full py-3 text-primary font-medium hover:underline"
      >
        Go Back
      </button>
    </div>
  );

  const renderProfileStep = () => {
    const universities = getUniversitiesForSchool(selectedSchool);
    
    return (
      <form onSubmit={handleProfileSubmit} className="space-y-4">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-3">
            {selectedSchool === 'law' ? <Scale className="w-3 h-3" /> : selectedSchool === 'business' ? <Briefcase className="w-3 h-3" /> : <Heart className="w-3 h-3" />}
            {getSchoolConfig(selectedSchool).name}
          </div>
          <h2 className="text-xl font-bold text-foreground">Complete Your Profile</h2>
          <p className="text-sm text-muted-foreground mt-1">Tell us about your studies</p>
        </div>

        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">Institution</label>
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
                placeholder="Enter your institution name"
                required
                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-secondary border border-border/50 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground placeholder:text-muted-foreground"
              />
            </div>
          )}
        </div>

        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">
            {formData.university === 'Zambia Institute of Advanced Legal Education (ZIALE)' ? 'Attempt Status' : 'Year of Study'}
          </label>
          <div className="relative">
            <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <select
              value={formData.yearOfStudy}
              onChange={(e) => setFormData({ ...formData, yearOfStudy: parseInt(e.target.value) })}
              className="w-full pl-12 pr-4 py-4 rounded-2xl bg-secondary border border-border/50 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground appearance-none"
            >
              {(formData.university === 'Zambia Institute of Advanced Legal Education (ZIALE)' ? zialeOptions : universityYears).map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
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
          Continue
        </button>

        <button
          type="button"
          onClick={() => setStep(hasPresetSchool ? 'credentials' : 'school')}
          className="w-full py-3 text-primary font-medium hover:underline"
        >
          Go Back
        </button>
      </form>
    );
  };

  const renderCoursesStep = () => {
    const canSubmit = formData.agreePrivacyPolicy && formData.agreeDataConsent;
    
    return (
      <form onSubmit={handleCoursesSubmit} className="space-y-4">
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-foreground">Select Your Courses</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Choose the courses you'd like to enroll in (optional)
          </p>
        </div>

        {loadingCourses ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : courses.length === 0 ? (
          <div className="text-center py-8">
            <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No courses available at the moment</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-48 overflow-y-auto">
            {courses.map((course) => {
              const isSelected = formData.selectedCourses.includes(course.id);
              return (
                <div
                  key={course.id}
                  onClick={() => toggleCourse(course.id)}
                  className={cn(
                    "p-4 rounded-2xl border cursor-pointer transition-all",
                    isSelected 
                      ? "bg-primary/10 border-primary/50" 
                      : "bg-secondary border-border/50 hover:border-primary/30"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5",
                      isSelected ? "border-primary bg-primary" : "border-muted-foreground"
                    )}>
                      {isSelected && <Check className="w-4 h-4 text-primary-foreground" />}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-foreground">{course.name}</h3>
                      {course.institution && (
                        <p className="text-xs text-primary mt-0.5">{course.institution}</p>
                      )}
                      {course.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {course.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {formData.selectedCourses.length > 0 && (
          <p className="text-sm text-center text-primary font-medium">
            {formData.selectedCourses.length} course(s) selected
          </p>
        )}

        {/* Consent Checkboxes */}
        <div className="space-y-3 pt-4 border-t border-border/50">
          <div className="flex items-start gap-3">
            <Checkbox
              id="privacyPolicy"
              checked={formData.agreePrivacyPolicy}
              onCheckedChange={(checked) => 
                setFormData(prev => ({ ...prev, agreePrivacyPolicy: checked === true }))
              }
              className="mt-0.5"
            />
            <label htmlFor="privacyPolicy" className="text-sm text-muted-foreground cursor-pointer leading-relaxed">
              I agree to <span className="text-primary font-medium">Luminary Innovision Academy's Privacy Policy</span>
            </label>
          </div>
          
          <div className="flex items-start gap-3">
            <Checkbox
              id="dataConsent"
              checked={formData.agreeDataConsent}
              onCheckedChange={(checked) => 
                setFormData(prev => ({ ...prev, agreeDataConsent: checked === true }))
              }
              className="mt-0.5"
            />
            <label htmlFor="dataConsent" className="text-sm text-muted-foreground cursor-pointer leading-relaxed">
              I consent to the use of my personal data for educational purposes
            </label>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !canSubmit}
          className={cn(
            "w-full py-4 rounded-2xl font-semibold text-primary-foreground gradient-primary shadow-glow transition-all",
            (loading || !canSubmit) ? "opacity-70 cursor-not-allowed" : "hover:opacity-90"
          )}
        >
          {loading ? 'Creating Account...' : (formData.selectedCourses.length > 0 ? 'Create Account & Enroll' : 'Create Account')}
        </button>

        {!canSubmit && (
          <p className="text-xs text-center text-muted-foreground">
            Please agree to both policies to continue
          </p>
        )}

        <button
          type="button"
          onClick={() => setStep('profile')}
          className="w-full py-3 text-primary font-medium hover:underline"
        >
          Go Back
        </button>
      </form>
    );
  };
  const getStepTitle = () => {
    switch (step) {
      case 'school': return 'Choose Your School';
      case 'profile': return 'Almost There!';
      case 'courses': return 'One Last Step!';
      case 'tutor-application': return 'Tutor Application';
      default: return isLogin ? 'Welcome!' : 'Create Account';
    }
  };

  const getStepDescription = () => {
    switch (step) {
      case 'school': return 'Select the academic division that matches your programme';
      case 'profile': return 'Tell us about your studies';
      case 'courses': return selectedRole === 'tutor' 
        ? 'Select the courses you want to teach' 
        : `Choose your ${getSchoolConfig(selectedSchool).name} courses`;
      case 'tutor-application': return 'Tell us about your qualifications';
      default: return isLogin 
        ? 'Sign in to access your account' 
        : (selectedRole === 'tutor' 
          ? 'Apply to share your expertise with students' 
          : 'Start your journey to academic excellence');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Back to Role Selection */}
      {step === 'credentials' && (
        <div className="px-5 pt-6">
          <Link 
            to="/welcome" 
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to welcome
          </Link>
        </div>
      )}

      {/* Header */}
      <div className={cn(
        "px-5 md:px-8 pt-6 pb-6 text-center",
        selectedSchool === 'law' ? "bg-gradient-to-b from-[hsl(220,56%,25%)]/15 to-transparent" :
        selectedSchool === 'business' ? "bg-gradient-to-b from-[hsl(155,45%,28%)]/15 to-transparent" :
        "bg-gradient-to-b from-[hsl(195,43%,29%)]/15 to-transparent"
      )}>
        <LMVLogo size="lg" className="justify-center mb-6" />
        
        {/* Role Toggle - Show on credentials step */}
        {step === 'credentials' && (
          <div className="flex justify-center mb-6">
            <div className="inline-flex rounded-full p-1 bg-secondary border border-border/50">
              <button
                type="button"
                onClick={() => handleRoleChange('student')}
                className={cn(
                  "px-5 py-2.5 rounded-full text-sm font-medium flex items-center gap-2 transition-all",
                  selectedRole === 'student'
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <BookOpen className="w-4 h-4" />
                Student
              </button>
              <button
                type="button"
                onClick={() => handleRoleChange('tutor')}
                className={cn(
                  "px-5 py-2.5 rounded-full text-sm font-medium flex items-center gap-2 transition-all",
                  selectedRole === 'tutor'
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <GraduationCap className="w-4 h-4" />
                Tutor
              </button>
            </div>
          </div>
        )}
        
        {/* Tutor login helper message - only show for tutor role on login */}
        {step === 'credentials' && isLogin && selectedRole === 'tutor' && (
          <p className="text-xs text-muted-foreground mb-4 max-w-xs mx-auto">
            Use your approved credentials. New tutors must{' '}
            <button 
              type="button"
              onClick={() => setIsLogin(false)}
              className="text-primary hover:underline"
            >
              sign up and apply
            </button>{' '}
            first.
          </p>
        )}
        
        <h1 className="text-2xl font-bold text-foreground mb-2">
          {getStepTitle()}
        </h1>
        <p className="text-muted-foreground text-sm max-w-xs mx-auto">
          {getStepDescription()}
        </p>
        
        {/* Step indicator for signup */}
        {!isLogin && (
          <div className="flex items-center justify-center gap-2 mt-4">
            {(selectedRole === 'tutor'
              ? ['credentials', 'tutor-application']
              : hasPresetSchool
                ? ['credentials', 'profile', 'courses']
                : ['credentials', 'school', 'profile', 'courses']
            ).map((s, idx, arr) => (
              <div
                key={s}
                className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  step === s ? "w-6 bg-primary" : 
                  arr.indexOf(step) > idx ? "bg-primary" : "bg-muted-foreground/30"
                )}
              />
            ))}
          </div>
        )}
      </div>

      {/* Form */}
      <div className="flex-1 px-5 md:px-8 py-8 max-w-md mx-auto w-full">
        {showApplicationSuccess ? (
          <div className="flex flex-col items-center text-center py-8">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
              <Check className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-3">Application Submitted!</h2>
            <p className="text-muted-foreground mb-6 max-w-sm">
              Thank you for applying to become a Luminary tutor. Our team will review your application and get back to you within <strong>24-48 hours</strong>.
            </p>
            <p className="text-sm text-muted-foreground mb-8">
              You'll receive an email notification with your login credentials once approved.
            </p>
            <button
              onClick={handleReturnToAuth}
              className={cn(
                "w-full py-4 rounded-2xl font-semibold text-primary-foreground gradient-primary shadow-glow transition-all hover:opacity-90"
              )}
            >
              Return to Login
            </button>
          </div>
        ) : (
          <>
            {step === 'credentials' && renderCredentialsStep()}
            {step === 'school' && renderSchoolStep()}
            {step === 'profile' && renderProfileStep()}
            {step === 'courses' && renderCoursesStep()}
            {step === 'tutor-application' && newUserId && (
              <TutorApplicationForm
                userId={newUserId}
                email={formData.email}
                fullName={formData.fullName}
                onSuccess={handleTutorApplicationSuccess}
              />
            )}
          </>
        )}

        {/* Toggle */}
        {step === 'credentials' && !showApplicationSuccess && (
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
            🇿🇲 Premium academic support designed for Zambian students
          </p>
          <p className="text-[10px] text-center text-muted-foreground/70 mt-1">
            {getSchoolConfig(selectedSchool).footerTagline}
          </p>
        </div>

        {/* Subtle Admin Login Link */}
        {step === 'credentials' && isLogin && (
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => navigate('/admin/auth')}
              className="text-[10px] text-muted-foreground/50 hover:text-muted-foreground transition-colors"
            >
              Admin Access
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthPage;