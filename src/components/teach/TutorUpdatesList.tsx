import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { 
  History, 
  Trash2, 
  Bell, 
  BookOpen, 
  AlertCircle, 
  Info,
  Video,
  Calendar,
  ExternalLink,
  CheckSquare,
  Square
} from 'lucide-react';
import { format } from 'date-fns';

interface TutorUpdatesListProps {
  courseId: string;
  tutorId: string;
}

interface TutorUpdate {
  id: string;
  title: string;
  content: string;
  update_type: string | null;
  class_time: string | null;
  class_link: string | null;
  created_at: string;
  is_published: boolean | null;
}

const TutorUpdatesList: React.FC<TutorUpdatesListProps> = ({ courseId, tutorId }) => {
  const { toast } = useToast();
  const [updates, setUpdates] = useState<TutorUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  useEffect(() => {
    if (courseId && tutorId) {
      loadUpdates();
    }
  }, [courseId, tutorId]);

  const loadUpdates = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tutor_updates')
        .select('*')
        .eq('course_id', courseId)
        .eq('tutor_id', tutorId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUpdates(data || []);
      setSelectedIds(new Set());
    } catch (error) {
      console.error('Error loading updates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (updateId: string) => {
    if (!confirm('Are you sure you want to delete this update?')) return;

    try {
      const { error } = await supabase
        .from('tutor_updates')
        .delete()
        .eq('id', updateId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Update deleted successfully',
      });

      loadUpdates();
    } catch (error) {
      console.error('Error deleting update:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete update',
        variant: 'destructive'
      });
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === updates.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(updates.map(u => u.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} update(s)?`)) return;

    setBulkDeleting(true);
    try {
      const { error } = await supabase
        .from('tutor_updates')
        .delete()
        .in('id', Array.from(selectedIds));

      if (error) throw error;

      toast({
        title: 'Success',
        description: `${selectedIds.size} update(s) deleted successfully`,
      });

      loadUpdates();
    } catch (error) {
      console.error('Error bulk deleting updates:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete updates',
        variant: 'destructive'
      });
    } finally {
      setBulkDeleting(false);
    }
  };

  const getUpdateIcon = (type: string | null) => {
    switch (type) {
      case 'class': return Video;
      case 'announcement': return Bell;
      case 'resource': return BookOpen;
      case 'alert': return AlertCircle;
      default: return Info;
    }
  };

  const getUpdateColor = (type: string | null) => {
    switch (type) {
      case 'class': return 'text-blue-500 bg-blue-500/10';
      case 'announcement': return 'text-yellow-500 bg-yellow-500/10';
      case 'resource': return 'text-green-500 bg-green-500/10';
      case 'alert': return 'text-red-500 bg-red-500/10';
      default: return 'text-primary bg-primary/10';
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <History className="w-5 h-5" />
          Update History
        </CardTitle>
        {updates.length > 0 && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleSelectAll}
              className="gap-2"
            >
              {selectedIds.size === updates.length ? (
                <CheckSquare className="w-4 h-4" />
              ) : (
                <Square className="w-4 h-4" />
              )}
              {selectedIds.size === updates.length ? 'Deselect All' : 'Select All'}
            </Button>
            {selectedIds.size > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
                disabled={bulkDeleting}
                className="gap-2"
              >
                <Trash2 className="w-4 h-4" />
                {bulkDeleting ? 'Deleting...' : `Delete (${selectedIds.size})`}
              </Button>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : updates.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No updates posted yet
          </p>
        ) : (
          <div className="space-y-4">
            {updates.map((update) => {
              const Icon = getUpdateIcon(update.update_type);
              const colorClasses = getUpdateColor(update.update_type);
              const isSelected = selectedIds.has(update.id);
              
              return (
                <div
                  key={update.id}
                  className={`p-4 border rounded-lg space-y-3 transition-colors ${
                    isSelected ? 'border-primary bg-primary/5' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelection(update.id)}
                        className="mt-1"
                      />
                      <div className={`p-2 rounded-full ${colorClasses}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-medium">{update.title}</h4>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(update.created_at), 'PPp')}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(update.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <p className="text-sm text-muted-foreground pl-14">
                    {update.content}
                  </p>

                  {update.update_type === 'class' && update.class_time && (
                    <div className="pl-14 flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        {format(new Date(update.class_time), 'PPp')}
                      </div>
                      {update.class_link && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(update.class_link!, '_blank')}
                        >
                          <ExternalLink className="w-3 h-3 mr-1" />
                          Join Link
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TutorUpdatesList;
