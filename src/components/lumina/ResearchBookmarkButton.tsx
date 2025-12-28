import React, { useState } from 'react';
import { Bookmark, BookmarkCheck, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ResearchBookmarkButtonProps {
  userQuery: string;
  aiResponse: string;
  className?: string;
}

export const ResearchBookmarkButton: React.FC<ResearchBookmarkButtonProps> = ({
  userQuery,
  aiResponse,
  className,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState('');

  // Extract sources from the AI response (URLs in the response)
  const extractSources = (response: string): string[] => {
    const urlRegex = /https?:\/\/[^\s\)]+/g;
    const matches = response.match(urlRegex) || [];
    return [...new Set(matches)]; // Remove duplicates
  };

  const handleBookmarkClick = () => {
    if (isBookmarked) {
      toast({
        title: 'Already saved',
        description: 'This research is already in your bookmarks.',
      });
      return;
    }
    
    // Generate a default title from the query
    const defaultTitle = userQuery.length > 60 
      ? userQuery.substring(0, 60) + '...' 
      : userQuery;
    setTitle(defaultTitle);
    setIsDialogOpen(true);
    haptics.light();
  };

  const handleSave = async () => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Not logged in',
        description: 'Please log in to save research.',
      });
      return;
    }

    setIsSaving(true);
    
    try {
      const sources = extractSources(aiResponse);
      const tagArray = tags
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);

      const { error } = await supabase
        .from('research_bookmarks')
        .insert({
          user_id: user.id,
          query: userQuery,
          response: aiResponse,
          sources: sources,
          tags: tagArray,
          title: title || userQuery.substring(0, 100),
        });

      if (error) throw error;

      setIsBookmarked(true);
      setIsDialogOpen(false);
      haptics.success();
      
      toast({
        title: 'Research saved',
        description: 'You can find it in Library → Saved Research.',
      });
    } catch (error) {
      console.error('Error saving bookmark:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to save',
        description: 'Could not save this research. Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <button
        onClick={handleBookmarkClick}
        className={cn(
          "flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-muted transition-colors text-xs",
          isBookmarked 
            ? "text-primary" 
            : "text-muted-foreground hover:text-foreground",
          className
        )}
        title={isBookmarked ? 'Saved' : 'Save research'}
        disabled={isSaving}
      >
        {isSaving ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : isBookmarked ? (
          <BookmarkCheck className="w-3.5 h-3.5" />
        ) : (
          <Bookmark className="w-3.5 h-3.5" />
        )}
        <span>{isBookmarked ? 'Saved' : 'Save'}</span>
      </button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save Research</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Give this research a title..."
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="e.g., contract law, zambia, case law"
              />
            </div>

            <div className="text-xs text-muted-foreground">
              <p className="font-medium mb-1">Query:</p>
              <p className="line-clamp-2">{userQuery}</p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="gradient-primary"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Research'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
