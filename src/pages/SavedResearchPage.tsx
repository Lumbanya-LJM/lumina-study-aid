import React, { useState, useEffect } from 'react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { LMVLogo } from '@/components/ui/lmv-logo';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { MarkdownRenderer } from '@/components/lumina/MarkdownRenderer';

import {
  Search,
  ArrowLeft,
  Bookmark,
  Trash2,
  ExternalLink,
  Clock,
  Tag,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  MessageCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ResearchBookmark {
  id: string;
  title: string | null;
  query: string;
  response: string;
  sources: string[];
  tags: string[];
  created_at: string;
}

interface RawBookmark {
  id: string;
  title: string | null;
  query: string;
  response: string;
  sources: string[];
  tags: string[];
  created_at: string;
}

const SavedResearchPage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [bookmarks, setBookmarks] = useState<ResearchBookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchBookmarks();
    }
  }, [user]);

  const fetchBookmarks = async () => {
    try {
      const { data, error } = await supabase
        .from('research_bookmarks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Parse sources from JSON with proper typing
      const parsed: ResearchBookmark[] = (data || []).map(item => ({
        id: item.id,
        title: item.title,
        query: item.query,
        response: item.response,
        created_at: item.created_at,
        sources: Array.isArray(item.sources) 
          ? item.sources.filter((s): s is string => typeof s === 'string')
          : [],
        tags: Array.isArray(item.tags) ? item.tags : [],
      }));
      
      setBookmarks(parsed);
    } catch (error) {
      console.error('Error fetching bookmarks:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load saved research.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    
    try {
      const { error } = await supabase
        .from('research_bookmarks')
        .delete()
        .eq('id', deleteId);

      if (error) throw error;

      setBookmarks(prev => prev.filter(b => b.id !== deleteId));
      toast({
        title: 'Deleted',
        description: 'Research removed from your bookmarks.',
      });
    } catch (error) {
      console.error('Error deleting bookmark:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete bookmark.',
      });
    } finally {
      setDeleteId(null);
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const filteredBookmarks = bookmarks.filter(bookmark => {
    const searchLower = searchQuery.toLowerCase();
    return (
      (bookmark.title?.toLowerCase().includes(searchLower)) ||
      bookmark.query.toLowerCase().includes(searchLower) ||
      bookmark.response.toLowerCase().includes(searchLower) ||
      bookmark.tags.some(tag => tag.toLowerCase().includes(searchLower))
    );
  });

  // Get all unique tags for filtering
  const allTags = [...new Set(bookmarks.flatMap(b => b.tags))];

  return (
    <MobileLayout>
      <div className="py-6 safe-top">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl hover:bg-secondary transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-foreground">Saved Research</h1>
            <p className="text-sm text-muted-foreground">
              {bookmarks.length} saved {bookmarks.length === 1 ? 'item' : 'items'}
            </p>
          </div>
          <LMVLogo size="sm" variant="icon" />
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search saved research..."
            className="pl-12"
          />
        </div>

        {/* Tag Filter */}
        {allTags.length > 0 && (
          <div className="flex gap-2 overflow-x-auto no-scrollbar mb-6 pb-2">
            {allTags.slice(0, 10).map(tag => (
              <button
                key={tag}
                onClick={() => setSearchQuery(tag)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors",
                  searchQuery === tag
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                )}
              >
                {tag}
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : filteredBookmarks.length === 0 ? (
          <div className="text-center py-12">
            <Bookmark className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-foreground font-medium">
              {searchQuery ? 'No matching research found' : 'No saved research yet'}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {searchQuery 
                ? 'Try a different search term' 
                : 'Save research from Lumina conversations to access later'}
            </p>
            {!searchQuery && (
              <Button
                onClick={() => navigate('/chat')}
                className="mt-4 gradient-primary"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Start Research
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredBookmarks.map(bookmark => (
              <div
                key={bookmark.id}
                className="bg-card rounded-2xl border border-border/50 overflow-hidden transition-all hover:border-primary/30"
              >
                {/* Header */}
                <button
                  onClick={() => setExpandedId(expandedId === bookmark.id ? null : bookmark.id)}
                  className="w-full p-4 text-left"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                      <Bookmark className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-foreground line-clamp-2">
                        {bookmark.title || bookmark.query}
                      </h3>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>{format(new Date(bookmark.created_at), 'MMM d, yyyy')}</span>
                        {bookmark.sources.length > 0 && (
                          <>
                            <span>•</span>
                            <span>{bookmark.sources.length} sources</span>
                          </>
                        )}
                      </div>
                      {bookmark.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {bookmark.tags.slice(0, 3).map(tag => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {bookmark.tags.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{bookmark.tags.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="shrink-0">
                      {expandedId === bookmark.id ? (
                        <ChevronUp className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </button>

                {/* Expanded Content */}
                {expandedId === bookmark.id && (
                  <div className="border-t border-border/50">
                    {/* Query */}
                    <div className="p-4 bg-muted/30">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Your Question</p>
                      <p className="text-sm text-foreground">{bookmark.query}</p>
                    </div>

                    {/* Response */}
                    <div className="p-4">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Lumina's Response</p>
                      <div className="prose-smooth text-sm max-h-[400px] overflow-y-auto">
                        <MarkdownRenderer content={bookmark.response} />
                      </div>
                    </div>

                    {/* Sources */}
                    {bookmark.sources.length > 0 && (
                      <div className="px-4 pb-4">
                        <p className="text-xs font-medium text-muted-foreground mb-2">Sources</p>
                        <div className="flex flex-wrap gap-2">
                          {bookmark.sources.map((source, idx) => (
                            <a
                              key={idx}
                              href={source}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 px-2 py-1 bg-secondary rounded-lg text-xs text-primary hover:bg-secondary/80 transition-colors"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span className="truncate max-w-[150px]">
                                {new URL(source).hostname}
                              </span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="px-4 pb-4 flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(bookmark.response, bookmark.id)}
                      >
                        {copiedId === bookmark.id ? (
                          <>
                            <Check className="w-4 h-4 mr-1 text-green-500" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4 mr-1" />
                            Copy
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(bookmark.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Research?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this saved research from your bookmarks.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MobileLayout>
  );
};

export default SavedResearchPage;
