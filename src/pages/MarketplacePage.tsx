import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { 
  Video, 
  Play, 
  Clock, 
  Calendar, 
  Search, 
  ShoppingCart,
  CheckCircle,
  User,
  ArrowLeft,
  Crown,
  Mail
} from 'lucide-react';
import { format } from 'date-fns';

interface MarketplaceClass {
  id: string;
  title: string;
  description: string | null;
  scheduled_at: string | null;
  ended_at: string | null;
  status: string;
  recording_url: string | null;
  recording_duration_seconds: number | null;
  live_class_price: number;
  recording_price: number;
  course_id: string | null;
  host_id: string;
  course_name?: string;
  host_name?: string;
  is_purchased?: boolean;
}

const MarketplacePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [classes, setClasses] = useState<MarketplaceClass[]>([]);
  const [purchases, setPurchases] = useState<Set<string>>(new Set());
  const [enrolledCourses, setEnrolledCourses] = useState<Set<string>>(new Set());
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [processingPurchase, setProcessingPurchase] = useState<string | null>(null);
  
  // Email collection modal
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [purchaseEmail, setPurchaseEmail] = useState('');
  const [pendingPurchase, setPendingPurchase] = useState<{ classItem: MarketplaceClass; type: 'live' | 'recording' } | null>(null);

  useEffect(() => {
    if (user) {
      loadMarketplace();
    }
  }, [user]);

  const loadMarketplace = async () => {
    try {
      setLoading(true);
      
      // Load all purchasable classes
      const { data: classesData, error: classesError } = await supabase
        .from('live_classes')
        .select(`
          id,
          title,
          description,
          scheduled_at,
          ended_at,
          status,
          recording_url,
          recording_duration_seconds,
          live_class_price,
          recording_price,
          course_id,
          host_id
        `)
        .eq('is_purchasable', true)
        .order('scheduled_at', { ascending: false });

      if (classesError) throw classesError;

      // Load user's purchases, enrollments, and subscription status
      const [purchasesRes, enrollmentsRes, subscriptionRes] = await Promise.all([
        supabase.from('class_purchases').select('class_id').eq('user_id', user?.id),
        supabase.from('academy_enrollments').select('course_id').eq('user_id', user?.id).eq('status', 'active'),
        supabase.from('subscriptions').select('*').eq('user_id', user?.id).eq('status', 'active').gte('expires_at', new Date().toISOString()).maybeSingle()
      ]);

      const purchasedIds = new Set(purchasesRes.data?.map(p => p.class_id) || []);
      const enrolledIds = new Set(enrollmentsRes.data?.map(e => e.course_id) || []);
      
      setPurchases(purchasedIds);
      setEnrolledCourses(enrolledIds);
      setHasActiveSubscription(!!subscriptionRes.data);

      // Fetch course names and host profiles
      const courseIds = [...new Set(classesData?.filter(c => c.course_id).map(c => c.course_id) || [])];
      const hostIds = [...new Set(classesData?.map(c => c.host_id) || [])];

      const [coursesRes, profilesRes] = await Promise.all([
        courseIds.length > 0 
          ? supabase.from('academy_courses').select('id, name').in('id', courseIds)
          : Promise.resolve({ data: [] }),
        hostIds.length > 0
          ? supabase.from('profiles').select('user_id, full_name').in('user_id', hostIds)
          : Promise.resolve({ data: [] })
      ]);

      const courseMap = new Map((coursesRes.data || []).map(c => [c.id, c.name]));
      const hostMap = new Map((profilesRes.data || []).map(p => [p.user_id, p.full_name]));

      const enrichedClasses = (classesData || []).map(c => ({
        ...c,
        course_name: c.course_id ? courseMap.get(c.course_id) || 'Unknown Course' : 'Standalone Class',
        host_name: hostMap.get(c.host_id) || 'Unknown Tutor',
        is_purchased: purchasedIds.has(c.id)
      }));

      setClasses(enrichedClasses);
    } catch (error) {
      console.error('Error loading marketplace:', error);
      toast({
        title: 'Error',
        description: 'Failed to load marketplace',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Check if user has free access (subscription or enrollment)
  const hasFreeAccess = (classItem: MarketplaceClass) => {
    if (hasActiveSubscription) return true;
    if (classItem.course_id && enrolledCourses.has(classItem.course_id)) return true;
    return false;
  };

  const handlePurchase = async (classItem: MarketplaceClass, type: 'live' | 'recording') => {
    if (!user) {
      navigate('/auth');
      return;
    }

    // Check if user has free access (subscription or course enrollment)
    if (hasFreeAccess(classItem)) {
      // Grant access without payment - just record as K0 purchase
      setProcessingPurchase(classItem.id);
      try {
        const { error } = await supabase
          .from('class_purchases')
          .insert({
            user_id: user.id,
            class_id: classItem.id,
            purchase_type: type,
            amount: 0,
            purchaser_email: user.email
          });

        if (error) throw error;

        toast({
          title: 'Access Granted!',
          description: 'You already have access through your subscription or enrollment.',
        });
        
        loadMarketplace();
      } catch (error) {
        console.error('Error granting access:', error);
        toast({
          title: 'Error',
          description: 'Failed to grant access',
          variant: 'destructive'
        });
      } finally {
        setProcessingPurchase(null);
      }
      return;
    }

    // For live class purchases, collect email first
    if (type === 'live') {
      setPurchaseEmail(user.email || '');
      setPendingPurchase({ classItem, type });
      setEmailModalOpen(true);
      return;
    }

    // For recordings, proceed directly
    proceedToPurchase(classItem, type, user.email || '');
  };

  const proceedToPurchase = (classItem: MarketplaceClass, type: 'live' | 'recording', email: string) => {
    setProcessingPurchase(classItem.id);
    
    try {
      const amount = type === 'live' ? classItem.live_class_price : classItem.recording_price;
      
      // Navigate to subscription page with purchase params including email
      navigate(`/subscription?purchase=class&classId=${classItem.id}&type=${type}&amount=${amount}&email=${encodeURIComponent(email)}`);
    } catch (error) {
      console.error('Purchase error:', error);
      toast({
        title: 'Error',
        description: 'Failed to initiate purchase',
        variant: 'destructive'
      });
    } finally {
      setProcessingPurchase(null);
    }
  };

  const handleEmailSubmit = () => {
    if (!purchaseEmail || !purchaseEmail.includes('@')) {
      toast({
        title: 'Invalid Email',
        description: 'Please enter a valid email address',
        variant: 'destructive'
      });
      return;
    }

    if (pendingPurchase) {
      setEmailModalOpen(false);
      proceedToPurchase(pendingPurchase.classItem, pendingPurchase.type, purchaseEmail);
      setPendingPurchase(null);
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'Unknown duration';
    const mins = Math.floor(seconds / 60);
    return `${mins} min`;
  };

  const filteredClasses = classes.filter(c => 
    c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.course_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.host_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const upcomingClasses = filteredClasses.filter(c => c.status === 'scheduled' || c.status === 'live');
  const recordingsAvailable = filteredClasses.filter(c => c.status === 'ended' && c.recording_url);

  const ClassCard: React.FC<{ item: MarketplaceClass; type: 'live' | 'recording' }> = ({ item, type }) => {
    const isPurchased = purchases.has(item.id);
    const isFreeAccess = hasFreeAccess(item);
    const price = type === 'live' ? item.live_class_price : item.recording_price;
    const isProcessing = processingPurchase === item.id;

    return (
      <Card className="border-border/50 hover:border-primary/30 transition-colors">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base line-clamp-2">{item.title}</CardTitle>
            {isPurchased ? (
              <Badge variant="secondary" className="shrink-0 gap-1">
                <CheckCircle className="w-3 h-3" />
                Owned
              </Badge>
            ) : isFreeAccess && (
              <Badge variant="default" className="shrink-0 gap-1 bg-primary/20 text-primary">
                <Crown className="w-3 h-3" />
                Included
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <User className="w-3 h-3" />
            <span>{item.host_name}</span>
            <span>•</span>
            <span>{item.course_name}</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {item.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
          )}
          
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            {type === 'live' && item.scheduled_at && (
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>{format(new Date(item.scheduled_at), 'MMM d, h:mm a')}</span>
              </div>
            )}
            {type === 'recording' && item.recording_duration_seconds && (
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{formatDuration(item.recording_duration_seconds)}</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            <div className="text-lg font-bold text-primary">
              {isFreeAccess && !isPurchased ? (
                <span className="text-sm text-muted-foreground line-through mr-2">K{price}</span>
              ) : null}
              {isFreeAccess ? 'Free' : `K${price}`}
            </div>
            {isPurchased ? (
              <Button 
                size="sm" 
                onClick={() => type === 'live' 
                  ? navigate(`/live-class/${item.id}`)
                  : navigate(`/recordings?classId=${item.id}`)
                }
              >
                {type === 'live' ? 'Join Class' : 'Watch Now'}
              </Button>
            ) : (
              <Button 
                size="sm" 
                onClick={() => handlePurchase(item, type)}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  'Processing...'
                ) : isFreeAccess ? (
                  'Get Access'
                ) : (
                  <>
                    <ShoppingCart className="w-4 h-4 mr-1" />
                    Buy Now
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <MobileLayout showNav={false}>
      <div className="p-4 pb-24 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">Class Marketplace</h1>
        </div>
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search classes, courses, or tutors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Info Banner */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">
              Purchase individual classes or recordings without a full course subscription. 
              Lifetime streaming access included.
            </p>
          </CardContent>
        </Card>

        <Tabs defaultValue="recordings" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="recordings" className="gap-2">
              <Video className="w-4 h-4" />
              Recordings
            </TabsTrigger>
            <TabsTrigger value="upcoming" className="gap-2">
              <Play className="w-4 h-4" />
              Upcoming
            </TabsTrigger>
          </TabsList>

          <TabsContent value="recordings" className="mt-4 space-y-4">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-40 w-full rounded-xl" />
              ))
            ) : recordingsAvailable.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Video className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No recordings available for purchase</p>
              </div>
            ) : (
              recordingsAvailable.map(item => (
                <ClassCard key={item.id} item={item} type="recording" />
              ))
            )}
          </TabsContent>

          <TabsContent value="upcoming" className="mt-4 space-y-4">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-40 w-full rounded-xl" />
              ))
            ) : upcomingClasses.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No upcoming classes available for purchase</p>
              </div>
            ) : (
              upcomingClasses.map(item => (
                <ClassCard key={item.id} item={item} type="live" />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Email Collection Modal for Live Class Purchases */}
      <Dialog open={emailModalOpen} onOpenChange={setEmailModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Enter Your Email
            </DialogTitle>
            <DialogDescription>
              We'll send the class join link to this email address.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="purchase-email">Email Address</Label>
              <Input
                id="purchase-email"
                type="email"
                value={purchaseEmail}
                onChange={(e) => setPurchaseEmail(e.target.value)}
                placeholder="your@email.com"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEmailModalOpen(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleEmailSubmit} className="flex-1">
                Continue to Payment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </MobileLayout>
  );
};

export default MarketplacePage;
