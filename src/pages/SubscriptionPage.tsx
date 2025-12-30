import React, { useState, useEffect } from 'react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { 
  ArrowLeft, 
  Crown, 
  Check, 
  Sparkles,
  BookOpen,
  Brain,
  Shield,
  Zap,
  GraduationCap,
  Users,
  Smartphone,
  Building2
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { useSchool } from '@/hooks/useSchool';
import { getSchoolConfig } from '@/config/schools';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Subscription {
  plan: string;
  status: string;
  expires_at?: string;
}

interface Course {
  id: string;
  name: string;
  description: string;
  price: number;
  institution: string;
}

interface ClassPurchaseInfo {
  classId: string;
  type: 'live' | 'recording';
  amount: number;
  title?: string;
  email?: string;
}

const plans = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    period: '',
    features: [
      '5 AI chats per day',
      'Basic study tools',
      'Limited library access',
      'Focus timer',
    ],
    disabled: ['Unlimited quizzes', 'Flashcard generation', 'Premium content', 'Study Groups', 'Priority support'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 150,
    period: '/month',
    features: [
      'Unlimited AI chats',
      'All study tools',
      'Full library access',
      'Unlimited quizzes',
      'Flashcard generation',
      'Premium content',
      'Study Groups & Community',
      'Priority support',
    ],
    popular: true,
  },
];

const SubscriptionPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const { school, schoolConfig } = useSchool();
  
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [provider, setProvider] = useState('mtn');
  const [selectedPlan, setSelectedPlan] = useState<'pro' | 'academy' | 'class'>('pro');
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [enrollments, setEnrollments] = useState<string[]>([]);
  const [classPurchase, setClassPurchase] = useState<ClassPurchaseInfo | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'mobile_money' | 'bank_transfer'>('mobile_money');
  const [accountNumber, setAccountNumber] = useState('');
  const [bankCode, setBankCode] = useState('');
  const [accountName, setAccountName] = useState('');

  useEffect(() => {
    loadSubscription();
    loadCourses();
    loadEnrollments();
    
    // Check for class purchase from URL params
    const purchaseType = searchParams.get('purchase');
    const classId = searchParams.get('classId');
    const type = searchParams.get('type') as 'live' | 'recording';
    const amount = searchParams.get('amount');
    const email = searchParams.get('email');
    
    if (purchaseType === 'class' && classId && type && amount) {
      loadClassInfo(classId, type, parseFloat(amount), email || undefined);
    }
  }, [searchParams]);

  const loadSubscription = async () => {
    const { data } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user?.id)
      .maybeSingle();

    if (data) {
      setSubscription(data);
    }
  };

  const loadCourses = async () => {
    const { data } = await supabase
      .from('academy_courses')
      .select('*')
      .eq('is_active', true)
      .order('name');

    setCourses(data || []);
  };

  const loadEnrollments = async () => {
    const { data } = await supabase
      .from('academy_enrollments')
      .select('course_id')
      .eq('user_id', user?.id)
      .eq('status', 'active');

    setEnrollments((data || []).map(e => e.course_id));
  };

  const loadClassInfo = async (classId: string, type: 'live' | 'recording', amount: number, email?: string) => {
    const { data } = await supabase
      .from('live_classes')
      .select('id, title')
      .eq('id', classId)
      .maybeSingle();
    
    if (data) {
      setClassPurchase({ classId, type, amount, title: data.title, email });
      setSelectedPlan('class');
      setShowPayment(true);
    }
  };

  const handleSubscribe = (plan: 'pro' | 'academy') => {
    setSelectedPlan(plan);
    if (plan === 'academy' && selectedCourses.length === 0) {
      toast({ variant: "destructive", title: "Error", description: "Please select at least one course" });
      return;
    }
    setShowPayment(true);
  };

  const toggleCourse = (courseId: string) => {
    setSelectedCourses(prev => 
      prev.includes(courseId) 
        ? prev.filter(id => id !== courseId)
        : [...prev, courseId]
    );
  };

  const calculateTotal = () => {
    if (selectedPlan === 'class' && classPurchase) return classPurchase.amount;
    if (selectedPlan === 'pro') return 150;
    return selectedCourses.length * 350;
  };

  const processPayment = async () => {
    // Validate based on payment method
    if (paymentMethod === 'mobile_money') {
      if (!phoneNumber.trim()) {
        toast({ variant: "destructive", title: "Error", description: "Please enter your phone number" });
        return;
      }
    } else {
      if (!accountNumber.trim()) {
        toast({ variant: "destructive", title: "Error", description: "Please enter your account number" });
        return;
      }
      if (!bankCode) {
        toast({ variant: "destructive", title: "Error", description: "Please select your bank" });
        return;
      }
      if (!accountName.trim()) {
        toast({ variant: "destructive", title: "Error", description: "Please enter the account holder name" });
        return;
      }
    }

    setIsLoading(true);
    try {
      const amount = calculateTotal();
      
      // Get the user's session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast({ variant: "destructive", title: "Error", description: "Please sign in to continue" });
        return;
      }
      
       const { data, error } = await supabase.functions.invoke('process-payment', {
         body: {
           amount,
           paymentMethod,
           // Mobile money fields
           phoneNumber: paymentMethod === 'mobile_money' ? phoneNumber : undefined,
           provider: paymentMethod === 'mobile_money' ? provider : undefined,
           // Bank transfer fields
           accountNumber: paymentMethod === 'bank_transfer' ? accountNumber : undefined,
           bankCode: paymentMethod === 'bank_transfer' ? bankCode : undefined,
           accountName: paymentMethod === 'bank_transfer' ? accountName : undefined,
           // Product info
           productType: selectedPlan === 'pro' ? 'subscription' : selectedPlan === 'class' ? 'class' : 'academy',
           selectedCourses: selectedPlan === 'academy' ? selectedCourses : undefined,
           classId: selectedPlan === 'class' ? classPurchase?.classId : undefined,
           classPurchaseType: selectedPlan === 'class' ? classPurchase?.type : undefined,
           purchaserEmail: selectedPlan === 'class' ? classPurchase?.email : undefined,
         },
       });

       if (error) {
         throw new Error((error as any)?.message || 'Payment failed');
       }

       const result = data as any;

      
      let successMessage = '';
      if (selectedPlan === 'pro') {
        successMessage = 'Your Pro subscription is now active';
      } else if (selectedPlan === 'class') {
        successMessage = `You now have access to "${classPurchase?.title}"`;
      } else {
        successMessage = 'Your Academy enrollment is now active';
      }
      
      toast({ 
        title: "Payment Initiated!", 
        description: result.message || successMessage 
      });
      
      setShowPayment(false);
      setClassPurchase(null);
      
      if (selectedPlan === 'class') {
        // Navigate back to marketplace or the purchased content
        navigate('/marketplace');
      } else {
        loadSubscription();
        loadEnrollments();
      }
    } catch (error) {
      toast({ 
        variant: "destructive", 
        title: "Payment Failed", 
        description: error instanceof Error ? error.message : "Please try again" 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isPro = subscription?.plan === 'pro' && subscription?.status === 'active';

  return (
    <MobileLayout showNav={false}>
      <div className="flex flex-col min-h-screen py-6 safe-top">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-secondary transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">Subscription</h1>
        </div>

        {showPayment ? (
          <div className="flex-1">
            <div className="bg-card rounded-3xl p-6 border border-border/50 mb-6">
              <h2 className="text-xl font-bold text-foreground mb-2">Payment Details</h2>
              <p className="text-muted-foreground mb-6">Choose your preferred payment method</p>

              <div className="space-y-4">
                {/* Payment Method Selection */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-3 block">
                    Payment Method
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('mobile_money')}
                      className={cn(
                        "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                        paymentMethod === 'mobile_money' 
                          ? "border-primary bg-primary/10" 
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <Smartphone className="w-6 h-6 text-primary" />
                      <span className="text-sm font-medium">Mobile Money</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('bank_transfer')}
                      className={cn(
                        "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                        paymentMethod === 'bank_transfer' 
                          ? "border-primary bg-primary/10" 
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <Building2 className="w-6 h-6 text-primary" />
                      <span className="text-sm font-medium">Bank Transfer</span>
                    </button>
                  </div>
                </div>

                {/* Mobile Money Fields */}
                {paymentMethod === 'mobile_money' && (
                  <>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">
                        Mobile Money Provider
                      </label>
                      <Select value={provider} onValueChange={setProvider}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select provider" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mtn">MTN Mobile Money</SelectItem>
                          <SelectItem value="airtel">Airtel Money</SelectItem>
                          <SelectItem value="zamtel">Zamtel Kwacha</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">
                        Phone Number
                      </label>
                      <Input
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="e.g., 0971234567"
                        type="tel"
                      />
                    </div>
                  </>
                )}

                {/* Bank Transfer Fields */}
                {paymentMethod === 'bank_transfer' && (
                  <>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">
                        Select Bank
                      </label>
                      <Select value={bankCode} onValueChange={setBankCode}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your bank" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ZANACO">Zanaco</SelectItem>
                          <SelectItem value="STANBIC">Stanbic Bank</SelectItem>
                          <SelectItem value="FNB">First National Bank</SelectItem>
                          <SelectItem value="ABSA">ABSA Bank</SelectItem>
                          <SelectItem value="STANDARD">Standard Chartered</SelectItem>
                          <SelectItem value="ATLAS">Atlas Mara</SelectItem>
                          <SelectItem value="INDO">Indo Zambia Bank</SelectItem>
                          <SelectItem value="ACCESS">Access Bank</SelectItem>
                          <SelectItem value="UBA">United Bank for Africa</SelectItem>
                          <SelectItem value="NATSAVE">National Savings</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">
                        Account Number
                      </label>
                      <Input
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                        placeholder="Enter your account number"
                        type="text"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">
                        Account Holder Name
                      </label>
                      <Input
                        value={accountName}
                        onChange={(e) => setAccountName(e.target.value)}
                        placeholder="Name as it appears on account"
                        type="text"
                      />
                    </div>
                  </>
                )}

                <div className="bg-secondary rounded-2xl p-4">
                  <div className="flex justify-between mb-2">
                    <span className="text-muted-foreground">
                      {selectedPlan === 'pro' 
                        ? 'Pro Plan' 
                        : selectedPlan === 'class' 
                          ? `${classPurchase?.type === 'live' ? 'Live Class' : 'Recording'}: ${classPurchase?.title?.substring(0, 30)}...`
                          : `Academy (${selectedCourses.length} courses)`}
                    </span>
                    <span className="font-medium text-foreground">K{calculateTotal()}.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Duration</span>
                    <span className="font-medium text-foreground">
                      {selectedPlan === 'class' ? 'Lifetime Access' : '1 Month'}
                    </span>
                  </div>
                </div>

                <Button 
                  onClick={processPayment}
                  disabled={isLoading}
                  className="w-full gradient-primary py-6"
                >
                  {isLoading ? (
                    <>
                      <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4 mr-2" />
                      Pay K{calculateTotal()}.00
                    </>
                  )}
                </Button>

                <Button 
                  onClick={() => setShowPayment(false)}
                  variant="outline"
                  className="w-full"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1">
            <Tabs defaultValue="plans" className="w-full">
              <TabsList className="w-full mb-6">
                <TabsTrigger value="plans" className="flex-1">Plans</TabsTrigger>
                <TabsTrigger value="academy" className="flex-1">Lumina Academy</TabsTrigger>
              </TabsList>

              <TabsContent value="plans">
                {isPro ? (
                  <div className="mb-6">
                    <div className="bg-gradient-to-br from-warning/20 to-warning/5 rounded-3xl p-6 border border-warning/30 mb-6">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-14 h-14 rounded-2xl bg-warning flex items-center justify-center">
                          <Crown className="w-7 h-7 text-warning-foreground" />
                        </div>
                        <div>
                          <h2 className="text-xl font-bold text-foreground">Pro Active</h2>
                          <p className="text-sm text-muted-foreground">
                            Expires: {subscription.expires_at ? new Date(subscription.expires_at).toLocaleDateString() : 'Never'}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        You have full access to all Pro features!
                      </p>
                    </div>

                    <h3 className="font-semibold text-foreground mb-4">Your Benefits</h3>
                    <div className="space-y-3">
                      {[
                        { icon: Sparkles, label: 'Unlimited AI Chats', desc: 'Ask Lumina anything, anytime' },
                        { icon: Brain, label: 'Unlimited Quizzes', desc: 'Test your knowledge without limits' },
                        { icon: BookOpen, label: 'Full Library Access', desc: 'All cases, papers, and content' },
                        { icon: Users, label: 'Study Groups', desc: 'Connect with fellow students' },
                        { icon: Zap, label: 'Priority Support', desc: 'Get help when you need it' },
                      ].map((benefit, i) => (
                        <div key={i} className="flex items-center gap-4 p-4 bg-card rounded-2xl border border-border/50">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                            <benefit.icon className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{benefit.label}</p>
                            <p className="text-xs text-muted-foreground">{benefit.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="text-center mb-8">
                      <div className="w-20 h-20 rounded-full gradient-primary mx-auto mb-4 flex items-center justify-center shadow-glow">
                        <Crown className="w-10 h-10 text-primary-foreground" />
                      </div>
                      <h2 className="text-2xl font-bold text-foreground mb-2">Unlock Pro</h2>
                      <p className="text-muted-foreground">Get unlimited access to all features</p>
                    </div>

                    <div className="space-y-4">
                      {plans.map((plan) => (
                        <div
                          key={plan.id}
                          className={cn(
                            "rounded-3xl p-5 border transition-all",
                            plan.popular
                              ? "bg-gradient-to-br from-primary/10 to-primary/5 border-primary/30 shadow-glow"
                              : "bg-card border-border/50"
                          )}
                        >
                          {plan.popular && (
                            <span className="inline-block px-3 py-1 bg-primary text-primary-foreground text-xs font-medium rounded-full mb-3">
                              Most Popular
                            </span>
                          )}
                          <div className="flex items-end gap-1 mb-4">
                            <span className="text-3xl font-bold text-foreground">K{plan.price}</span>
                            <span className="text-muted-foreground">{plan.period}</span>
                          </div>
                          <h3 className="font-semibold text-foreground mb-4">{plan.name}</h3>
                          
                          <div className="space-y-2 mb-6">
                            {plan.features.map((feature, i) => (
                              <div key={i} className="flex items-center gap-2">
                                <Check className="w-4 h-4 text-success" />
                                <span className="text-sm text-foreground">{feature}</span>
                              </div>
                            ))}
                            {plan.disabled?.map((feature, i) => (
                              <div key={i} className="flex items-center gap-2 opacity-50">
                                <Check className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground line-through">{feature}</span>
                              </div>
                            ))}
                          </div>

                          {plan.id === 'pro' && (
                            <Button onClick={() => handleSubscribe('pro')} className="w-full gradient-primary">
                              Subscribe Now - K150/month
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </TabsContent>

              <TabsContent value="academy">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 mx-auto mb-4 flex items-center justify-center">
                    <GraduationCap className="w-8 h-8 text-primary" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground mb-2">Lumina Academy</h2>
                  <p className="text-sm text-muted-foreground">
                    Get direct access to your tutors and class updates
                  </p>
                </div>

                <div className="bg-card rounded-2xl p-4 border border-border/50 mb-6">
                  <h3 className="font-semibold text-foreground mb-3">K350/course/month includes:</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-success" />
                      Real-time alerts from tutors
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-success" />
                      Direct links to online classes
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-success" />
                      Class schedules and updates
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-success" />
                      Course-specific materials
                    </li>
                  </ul>
                </div>

                <h3 className="font-semibold text-foreground mb-3">Select {schoolConfig.name} Courses</h3>
                <div className="space-y-2 mb-6">
                  {courses.filter(c => schoolConfig.institutions.some(inst => inst.shortName === c.institution || inst.id === c.institution)).map((course) => {
                    const isEnrolled = enrollments.includes(course.id);
                    const isSelected = selectedCourses.includes(course.id);
                    
                    return (
                      <div
                        key={course.id}
                        onClick={() => !isEnrolled && toggleCourse(course.id)}
                        className={cn(
                          "flex items-center gap-3 p-4 rounded-2xl border transition-all cursor-pointer",
                          isEnrolled 
                            ? "bg-success/10 border-success/30 cursor-default"
                            : isSelected
                              ? "bg-primary/10 border-primary/30"
                              : "bg-card border-border/50 hover:border-primary/30"
                        )}
                      >
                        {isEnrolled ? (
                          <div className="w-5 h-5 rounded bg-success flex items-center justify-center">
                            <Check className="w-3 h-3 text-success-foreground" />
                          </div>
                        ) : (
                          <Checkbox checked={isSelected} />
                        )}
                        <div className="flex-1">
                          <p className="font-medium text-foreground text-sm">{course.name}</p>
                          {isEnrolled && (
                            <p className="text-xs text-success">Enrolled</p>
                          )}
                        </div>
                        {!isEnrolled && (
                          <span className="text-sm font-medium text-foreground">K{course.price}</span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {selectedCourses.length > 0 && (
                  <div className="bg-secondary rounded-2xl p-4 mb-4">
                    <div className="flex justify-between mb-2">
                      <span className="text-muted-foreground">{selectedCourses.length} courses selected</span>
                      <span className="font-bold text-foreground">K{selectedCourses.length * 350}.00</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Monthly subscription per course</p>
                  </div>
                )}

                <Button 
                  onClick={() => handleSubscribe('academy')}
                  disabled={selectedCourses.length === 0}
                  className="w-full gradient-primary"
                >
                  Subscribe to Academy
                </Button>

                <p className="text-xs text-muted-foreground text-center mt-4">
                  Powered by Lumina Teach - Updates from your tutors will appear in real-time
                </p>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </MobileLayout>
  );
};

export default SubscriptionPage;
