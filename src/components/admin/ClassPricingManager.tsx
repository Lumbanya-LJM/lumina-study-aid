import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  DollarSign, Video, Play, Loader2, Save, X,
  Calendar, Clock
} from 'lucide-react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface LiveClass {
  id: string;
  title: string;
  description: string | null;
  status: string;
  scheduled_at: string | null;
  live_class_price: number | null;
  recording_price: number | null;
  is_purchasable: boolean | null;
  recording_url: string | null;
}

const ClassPricingManager: React.FC = () => {
  const { toast } = useToast();
  const [classes, setClasses] = useState<LiveClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingClass, setEditingClass] = useState<LiveClass | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    live_class_price: 50,
    recording_price: 30,
    is_purchasable: true
  });

  const loadClasses = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('live_classes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClasses(data || []);
    } catch (error) {
      console.error('Error loading classes:', error);
      toast({
        title: 'Error',
        description: 'Failed to load classes',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

  const handleEdit = (cls: LiveClass) => {
    setEditingClass(cls);
    setFormData({
      live_class_price: cls.live_class_price ?? 50,
      recording_price: cls.recording_price ?? 30,
      is_purchasable: cls.is_purchasable ?? true
    });
  };

  const handleSave = async () => {
    if (!editingClass) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('live_classes')
        .update({
          live_class_price: formData.live_class_price,
          recording_price: formData.recording_price,
          is_purchasable: formData.is_purchasable
        })
        .eq('id', editingClass.id);

      if (error) throw error;

      toast({ title: 'Success', description: 'Class pricing updated' });
      setEditingClass(null);
      loadClasses();
    } catch (error) {
      console.error('Error saving pricing:', error);
      toast({
        title: 'Error',
        description: 'Failed to update pricing',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'live':
        return <Badge variant="destructive">Live</Badge>;
      case 'ended':
        return <Badge variant="secondary">Ended</Badge>;
      default:
        return <Badge variant="outline">Scheduled</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          Class Pricing Management
        </CardTitle>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : classes.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No classes found</p>
        ) : (
          <div className="space-y-3">
            {classes.map((cls) => (
              <div 
                key={cls.id}
                className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg"
              >
                <div className="p-2 rounded-lg bg-primary/10">
                  {cls.recording_url ? (
                    <Video className="w-4 h-4 text-primary" />
                  ) : (
                    <Play className="w-4 h-4 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-sm truncate">{cls.title}</p>
                    {getStatusBadge(cls.status)}
                  </div>
                  {cls.scheduled_at && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(cls.scheduled_at), 'MMM d, yyyy')}
                      <Clock className="w-3 h-3 ml-2" />
                      {format(new Date(cls.scheduled_at), 'h:mm a')}
                    </div>
                  )}
                  <div className="flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1">
                      <Play className="w-3 h-3" />
                      Live: K{cls.live_class_price ?? 50}
                    </span>
                    <span className="flex items-center gap-1">
                      <Video className="w-3 h-3" />
                      Recording: K{cls.recording_price ?? 30}
                    </span>
                    {!cls.is_purchasable && (
                      <Badge variant="outline" className="text-xs">Not for sale</Badge>
                    )}
                  </div>
                </div>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleEdit(cls)}
                >
                  Edit Price
                </Button>
              </div>
            ))}
          </div>
        )}

        <Dialog open={!!editingClass} onOpenChange={(open) => !open && setEditingClass(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Class Pricing</DialogTitle>
            </DialogHeader>
            {editingClass && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">{editingClass.title}</p>

                <div className="space-y-2">
                  <Label htmlFor="live_price">Live Class Price (ZMW)</Label>
                  <Input
                    id="live_price"
                    type="number"
                    value={formData.live_class_price}
                    onChange={(e) => setFormData({ ...formData, live_class_price: Number(e.target.value) })}
                    min={0}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="recording_price">Recording Price (ZMW)</Label>
                  <Input
                    id="recording_price"
                    type="number"
                    value={formData.recording_price}
                    onChange={(e) => setFormData({ ...formData, recording_price: Number(e.target.value) })}
                    min={0}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="is_purchasable">Available for Purchase</Label>
                  <Switch
                    id="is_purchasable"
                    checked={formData.is_purchasable}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_purchasable: checked })}
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setEditingClass(null)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default ClassPricingManager;
