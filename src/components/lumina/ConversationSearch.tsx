import React, { useState, useEffect } from 'react';
import { Search, X, MessageCircle, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';

interface SearchResult {
  id: string;
  content: string;
  role: string;
  created_at: string;
  conversation_id: string;
  conversation_title?: string;
}

interface ConversationSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectConversation: (conversationId: string) => void;
}

export const ConversationSearch: React.FC<ConversationSearchProps> = ({
  isOpen,
  onClose,
  onSelectConversation,
}) => {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!query.trim() || !user) {
      setResults([]);
      return;
    }

    const searchDebounce = setTimeout(async () => {
      setIsSearching(true);
      try {
        // Search messages
        const { data: messages, error: messagesError } = await supabase
          .from('chat_messages')
          .select('id, content, role, created_at, conversation_id')
          .eq('user_id', user.id)
          .ilike('content', `%${query}%`)
          .order('created_at', { ascending: false })
          .limit(20);

        if (messagesError) throw messagesError;

        if (messages && messages.length > 0) {
          // Get unique conversation IDs
          const conversationIds = [...new Set(messages.map(m => m.conversation_id).filter(Boolean))];
          
          // Fetch conversation titles
          const { data: conversations } = await supabase
            .from('conversations')
            .select('id, title')
            .in('id', conversationIds);

          const conversationMap = new Map(conversations?.map(c => [c.id, c.title]) || []);

          // Combine results
          const enrichedResults = messages.map(m => ({
            ...m,
            conversation_title: m.conversation_id ? conversationMap.get(m.conversation_id) : undefined,
          }));

          setResults(enrichedResults);
        } else {
          setResults([]);
        }
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(searchDebounce);
  }, [query, user]);

  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text;
    
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={i} className="bg-primary/30 text-foreground rounded px-0.5">{part}</mark>
      ) : part
    );
  };

  const truncateContent = (content: string, maxLength: number = 150) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex flex-col">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border safe-top">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10 pr-10"
              autoFocus
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-secondary"
              >
                <X className="w-3 h-3 text-muted-foreground" />
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-secondary transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Results */}
      <ScrollArea className="flex-1">
        <div className="px-5 py-4 space-y-2">
          {isSearching ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : query && results.length === 0 ? (
            <div className="text-center py-12">
              <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">No results found for "{query}"</p>
            </div>
          ) : results.length > 0 ? (
            results.map((result) => (
              <button
                key={result.id}
                onClick={() => {
                  if (result.conversation_id) {
                    onSelectConversation(result.conversation_id);
                    onClose();
                  }
                }}
                className={cn(
                  "w-full text-left p-4 rounded-xl transition-colors",
                  "bg-card border border-border/50 hover:border-primary/30"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                    result.role === 'user' ? "bg-secondary" : "bg-primary/10"
                  )}>
                    <MessageCircle className={cn(
                      "w-4 h-4",
                      result.role === 'user' ? "text-muted-foreground" : "text-primary"
                    )} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-muted-foreground capitalize">
                        {result.role === 'user' ? 'You' : 'Lumina'}
                      </span>
                      <span className="text-xs text-muted-foreground/60">•</span>
                      <span className="text-xs text-muted-foreground/60 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(result.created_at), 'MMM d, yyyy')}
                      </span>
                    </div>
                    <p className="text-sm text-foreground leading-relaxed">
                      {highlightMatch(truncateContent(result.content), query)}
                    </p>
                    {result.conversation_title && (
                      <p className="text-xs text-primary mt-2 font-medium">
                        From: {result.conversation_title}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            ))
          ) : (
            <div className="text-center py-12">
              <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">Search your Lumina conversations</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Find past discussions on any topic
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
