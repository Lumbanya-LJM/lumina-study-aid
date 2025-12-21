import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { LMVLogo } from '@/components/ui/lmv-logo';
import { Eye, EyeOff, Mail, Lock, User, GraduationCap, Building, BookOpen, Check, Loader2, ArrowLeft, ChevronLeft, Award } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { Checkbox } from '@/components/ui/checkbox';
import TutorApplicationForm from '@/components/auth/TutorApplicationForm';

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

interface Course {
  id: string;
  name: string;
  description: string | null;
  institution: string | null;
}

const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectedRole = searchParams.get('role') || 'student';
  const { signUp, signIn } = useAuth();
  const { toast } = useToast();
  
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'credentials' | 'profile' | 'courses' | 'tutor-application'>('credentials');
  const [courses, setCourses] = useState<Course[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [newUserId, setNewUserId] = useState<string | null>(null);
  
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

  // Load available courses when reaching the courses step
  useEffect(() => {
    if (step === 'courses' && courses.length === 0) {
      loadCourses();
    }
  }, [step]);

  const loadCourses = async () => {
    setLoadingCourses(true);
    try {
      const { data, error } = await supabase
        .from('academy_courses')
        .select('id, name, description, institution')
        .eq('is_active', true);
      
      if (error) throw error;
      setCourses(data || []);
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

          // Send welcome email (fire and forget - don't block signup)
          supabase.functions.invoke('send-welcome-email', {
            body: { email: formData.email, fullName: formData.fullName }
          }).then(({ error }) => {
            if (error) console.error('Welcome email error:', error);
          });

          // Clear onboarding flag to ensure new users see the tutorial
          localStorage.removeItem('luminary_onboarding_complete');

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

  const handleTutorApplicationSuccess = () => {
    toast({
      title: "Application Submitted!",
      description: "Your tutor application is pending review. You can use the app as a student in the meantime.",
    });
    navigate('/home');
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
          "w-full py-4 rounded-2xl font-semibold transition-all",
          selectedRole === 'tutor'
            ? "bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-lg shadow-amber-500/20"
            : "text-primary-foreground gradient-primary shadow-glow",
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
        Continue
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
          {loading ? 'Creating Account...' : formData.selectedCourses.length > 0 ? 'Create Account & Enroll' : 'Create Account'}
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
      case 'profile': return 'Almost There!';
      case 'courses': return 'One Last Step!';
      case 'tutor-application': return 'Tutor Application';
      default: return isLogin ? 'Welcome Back' : (selectedRole === 'tutor' ? 'Join as Tutor' : 'Join Luminary');
    }
  };

  const getStepDescription = () => {
    switch (step) {
      case 'profile': return 'Tell us about your studies';
      case 'courses': return 'Choose your courses to get started';
      case 'tutor-application': return 'Complete your tutor application';
      default: return isLogin 
        ? 'Sign in to continue your studies' 
        : (selectedRole === 'tutor' 
          ? 'Apply to share your expertise with students' 
          : 'Create your account to start excelling');
    }
  };

  const isTutor = selectedRole === 'tutor';

  return (
    <div className={cn(
      "min-h-screen flex flex-col",
      isTutor 
        ? "bg-gradient-to-br from-amber-950/20 via-background to-orange-950/10" 
        : "bg-background"
    )}>
      {/* Back to Role Selection */}
      {step === 'credentials' && (
        <div className="px-5 pt-6">
          <Link 
            to="/welcome" 
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Change role selection
          </Link>
        </div>
      )}

      {/* Role Badge */}
      {step === 'credentials' && (
        <div className="flex justify-center mt-4">
          <div className={cn(
            "px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2",
            isTutor 
              ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" 
              : "bg-primary/20 text-primary border border-primary/30"
          )}>
            {isTutor ? (
              <>
                <GraduationCap className="w-4 h-4" />
                Tutor Registration
              </>
            ) : (
              <>
                <BookOpen className="w-4 h-4" />
                Student Registration
              </>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div className={cn(
        "px-5 md:px-8 pt-6 pb-6 text-center",
        isTutor ? "gradient-subtle" : "gradient-subtle"
      )}>
        <LMVLogo size="lg" className="justify-center mb-4" />
        <h1 className={cn(
          "text-2xl font-bold mb-2",
          isTutor ? "text-amber-400" : "text-foreground"
        )}>
          {getStepTitle()}
        </h1>
        <p className="text-muted-foreground text-sm max-w-xs mx-auto">
          {getStepDescription()}
        </p>
        
        {/* Step indicator for signup */}
        {!isLogin && (
          <div className="flex items-center justify-center gap-2 mt-4">
            {['credentials', 'profile', 'courses'].map((s, idx) => (
              <div
                key={s}
                className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  step === s ? "w-6" : "",
                  step === s 
                    ? (isTutor ? "bg-amber-500" : "bg-primary")
                    : ['credentials', 'profile', 'courses'].indexOf(step) > idx 
                      ? (isTutor ? "bg-amber-500" : "bg-primary") 
                      : "bg-muted-foreground/30"
                )}
              />
            ))}
          </div>
        )}
      </div>

      {/* Form */}
      <div className="flex-1 px-5 md:px-8 py-8 max-w-md mx-auto w-full">
        {step === 'credentials' && renderCredentialsStep()}
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