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
  Zap
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Subscription {
  plan: string;
  status: string;
  expires_at?: string;
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
    disabled: ['Unlimited quizzes', 'Flashcard generation', 'Premium content', 'Priority support'],
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 99,
    period: '/month',
    features: [
      'Unlimited AI chats',
      'All study tools',
      'Full library access',
      'Unlimited quizzes',
      'Flashcard generation',
      'Premium content',
      'Priority support',
    ],
    popular: true,
  },
];

const SubscriptionPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [provider, setProvider] = useState('mtn');

  useEffect(() => {
    loadSubscription();
  }, []);

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

  const handleSubscribe = () => {
    setShowPayment(true);
  };

  const processPayment = async () => {
    if (!phoneNumber.trim()) {
      toast({ variant: "destructive", title: "Error", description: "Please enter your phone number" });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          amount: 99,
          phoneNumber,
          provider,
          productType: 'subscription',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Payment failed');
      }

      const result = await response.json();
      toast({ 
        title: "Payment Successful!", 
        description: result.message || "Your premium subscription is now active" 
      });
      
      setShowPayment(false);
      loadSubscription();
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

  const isPremium = subscription?.plan === 'premium' && subscription?.status === 'active';

  return (
    <MobileLayout showNav={false}>
      <div className="flex flex-col min-h-screen px-5 py-6 safe-top">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-secondary transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">Subscription</h1>
        </div>

        {isPremium ? (
          <div className="flex-1">
            <div className="bg-gradient-to-br from-warning/20 to-warning/5 rounded-3xl p-6 border border-warning/30 mb-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-2xl bg-warning flex items-center justify-center">
                  <Crown className="w-7 h-7 text-warning-foreground" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">Premium Active</h2>
                  <p className="text-sm text-muted-foreground">
                    Expires: {subscription.expires_at ? new Date(subscription.expires_at).toLocaleDateString() : 'Never'}
                  </p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                You have full access to all premium features. Keep up the great study habits!
              </p>
            </div>

            <h3 className="font-semibold text-foreground mb-4">Your Benefits</h3>
            <div className="space-y-3">
              {[
                { icon: Sparkles, label: 'Unlimited AI Chats', desc: 'Ask Lumina anything, anytime' },
                { icon: Brain, label: 'Unlimited Quizzes', desc: 'Test your knowledge without limits' },
                { icon: BookOpen, label: 'Full Library Access', desc: 'All cases, papers, and content' },
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
        ) : showPayment ? (
          <div className="flex-1">
            <div className="bg-card rounded-3xl p-6 border border-border/50 mb-6">
              <h2 className="text-xl font-bold text-foreground mb-2">Payment Details</h2>
              <p className="text-muted-foreground mb-6">Pay with Mobile Money</p>

              <div className="space-y-4">
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

                <div className="bg-secondary rounded-2xl p-4">
                  <div className="flex justify-between mb-2">
                    <span className="text-muted-foreground">Premium Plan</span>
                    <span className="font-medium text-foreground">K99.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Duration</span>
                    <span className="font-medium text-foreground">1 Month</span>
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
                      Pay K99.00
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
            <div className="text-center mb-8">
              <div className="w-20 h-20 rounded-full gradient-primary mx-auto mb-4 flex items-center justify-center shadow-glow">
                <Crown className="w-10 h-10 text-primary-foreground" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Unlock Premium</h2>
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

                  {plan.id === 'premium' && (
                    <Button onClick={handleSubscribe} className="w-full gradient-primary">
                      Subscribe Now
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </MobileLayout>
  );
};

export default SubscriptionPage;
