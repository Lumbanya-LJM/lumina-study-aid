import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Video, Play, ShoppingBag, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface Purchase {
  id: string;
  class_id: string;
  purchase_type: string;
  amount: number;
  purchased_at: string;
  class?: {
    title: string;
    description: string | null;
    recording_url: string | null;
    scheduled_at: string | null;
    status: string;
  };
}

const MyPurchasesSection: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPurchases = async () => {
      if (!user?.id) return;

      try {
        const { data, error } = await supabase
          .from('class_purchases')
          .select(`
            id,
            class_id,
            purchase_type,
            amount,
            purchased_at,
            live_classes (
              title,
              description,
              recording_url,
              scheduled_at,
              status
            )
          `)
          .eq('user_id', user.id)
          .order('purchased_at', { ascending: false });

        if (error) throw error;

        const formattedPurchases = (data || []).map((p: any) => ({
          id: p.id,
          class_id: p.class_id,
          purchase_type: p.purchase_type,
          amount: p.amount,
          purchased_at: p.purchased_at,
          class: p.live_classes
        }));

        setPurchases(formattedPurchases);
      } catch (error) {
        console.error('Error loading purchases:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPurchases();
  }, [user?.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (purchases.length === 0) {
    return (
      <div className="bg-card rounded-2xl border border-border/50 shadow-card p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-primary/10">
            <ShoppingBag className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">My Purchases</h2>
            <p className="text-xs text-muted-foreground">Classes and recordings you've purchased</p>
          </div>
        </div>
        <div className="text-center py-8">
          <ShoppingBag className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-4">No purchases yet</p>
          <Button onClick={() => navigate('/marketplace')} size="sm">
            Browse Classes
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl border border-border/50 shadow-card p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-xl bg-primary/10">
          <ShoppingBag className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <h2 className="font-semibold text-foreground">My Purchases</h2>
          <p className="text-xs text-muted-foreground">{purchases.length} item{purchases.length !== 1 ? 's' : ''} purchased</p>
        </div>
      </div>

      <div className="space-y-3">
        {purchases.map((purchase) => (
          <div 
            key={purchase.id}
            className="flex items-start gap-3 p-3 bg-muted/50 rounded-xl"
          >
            <div className="p-2 rounded-lg bg-primary/10">
              {purchase.purchase_type === 'recording' ? (
                <Video className="w-4 h-4 text-primary" />
              ) : (
                <Play className="w-4 h-4 text-primary" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-foreground truncate">
                {purchase.class?.title || 'Class'}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="text-xs">
                  {purchase.purchase_type === 'recording' ? 'Recording' : 'Live Class'}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  K{purchase.amount}
                </span>
              </div>
              <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                <Calendar className="w-3 h-3" />
                {format(new Date(purchase.purchased_at), 'MMM d, yyyy')}
              </div>
            </div>
            {purchase.purchase_type === 'recording' && purchase.class?.recording_url && (
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => navigate('/recordings')}
              >
                Watch
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default MyPurchasesSection;
