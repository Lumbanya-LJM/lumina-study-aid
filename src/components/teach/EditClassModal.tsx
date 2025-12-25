import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Calendar, Clock, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

interface EditClassModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classId: string | null;
  onSuccess?: () => void;
}

interface ClassData {
  id: string;
  title: string;
  description: string | null;
  scheduled_at: string | null;
  status: string;
}

// Zambia timezone (CAT - Central Africa Time)
const ZAMBIA_TIMEZONE = 'Africa/Lusaka';

export const EditClassModal: React.FC<EditClassModalProps> = ({
  open,
  onOpenChange,
  classId,
  onSuccess,
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');

  useEffect(() => {
    if (open && classId) {
      loadClass();
    }
  }, [open, classId]);

  const loadClass = async () => {
    if (!classId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('live_classes')
        .select('id, title, description, scheduled_at, status')
        .eq('id', classId)
        .single();

      if (error) throw error;

      if (data) {
        setTitle(data.title);
        setDescription(data.description || '');
        if (data.scheduled_at) {
          // Format in Zambia timezone
          const scheduledDate = new Date(data.scheduled_at);
          setDate(formatInTimeZone(scheduledDate, ZAMBIA_TIMEZONE, 'yyyy-MM-dd'));
          setTime(formatInTimeZone(scheduledDate, ZAMBIA_TIMEZONE, 'HH:mm'));
        }
      }
    } catch (error) {
      console.error('Error loading class:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load class details.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!classId) return;

    if (!title.trim()) {
      toast({
        variant: 'destructive',
        title: 'Title Required',
        description: 'Please enter a class title.',
      });
      return;
    }

    setSaving(true);
    try {
      // Create scheduled_at in Zambia timezone
      let scheduledAt: string | null = null;
      if (date && time) {
        // Parse date and time as Zambia time
        const dateTimeStr = `${date}T${time}:00`;
        const localDate = new Date(dateTimeStr);
        // Adjust for Zambia timezone (UTC+2)
        const zambiaOffset = 2 * 60; // minutes
        const localOffset = localDate.getTimezoneOffset();
        const adjustedDate = new Date(localDate.getTime() + (localOffset + zambiaOffset) * 60 * 1000);
        scheduledAt = adjustedDate.toISOString();
      }

      const { error } = await supabase
        .from('live_classes')
        .update({
          title: title.trim(),
          description: description.trim() || null,
          scheduled_at: scheduledAt,
          updated_at: new Date().toISOString(),
        })
        .eq('id', classId);

      if (error) throw error;

      toast({
        title: 'Class Updated',
        description: 'The class details have been saved.',
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error saving class:', error);
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: 'Could not save class details.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!classId) return;

    if (!confirm('Are you sure you want to delete this class? This action cannot be undone.')) {
      return;
    }

    setDeleting(true);
    try {
      const { error } = await supabase
        .from('live_classes')
        .delete()
        .eq('id', classId);

      if (error) throw error;

      toast({
        title: 'Class Deleted',
        description: 'The class has been removed.',
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error deleting class:', error);
      toast({
        variant: 'destructive',
        title: 'Delete Failed',
        description: 'Could not delete the class.',
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Class</DialogTitle>
          <DialogDescription>
            Modify the scheduled class details (Zambia time - CAT)
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Class Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter class title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the class"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date" className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Date
                </Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time" className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Time (CAT)
                </Label>
                <Input
                  id="time"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                />
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Times are in Central Africa Time (CAT/Zambia - UTC+2)
            </p>
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting || saving || loading}
            className="w-full sm:w-auto"
          >
            {deleting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4 mr-2" />
            )}
            Delete
          </Button>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || loading} className="flex-1">
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
