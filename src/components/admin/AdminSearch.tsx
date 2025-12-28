import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Search, 
  User, 
  BookOpen, 
  UserCheck, 
  Loader2, 
  X,
  Eye,
  Pencil,
  CheckCircle,
  Clock,
  Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import { toast } from 'sonner';

interface SearchResult {
  id: string;
  type: 'student' | 'course' | 'application';
  title: string;
  subtitle?: string;
  status?: string;
}

interface RecentSearch {
  query: string;
  timestamp: number;
  result?: SearchResult;
}

interface AdminSearchProps {
  onTabChange?: (tab: string) => void;
}

const RECENT_SEARCHES_KEY = 'admin_recent_searches';
const MAX_RECENT_SEARCHES = 5;

export const AdminSearch: React.FC<AdminSearchProps> = ({ onTabChange }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [showRecent, setShowRecent] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (stored) {
      try {
        setRecentSearches(JSON.parse(stored));
      } catch {
        setRecentSearches([]);
      }
    }
  }, []);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowRecent(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search when query changes
  useEffect(() => {
    const searchTimeout = setTimeout(async () => {
      if (query.trim().length < 2) {
        setResults([]);
        if (query.length === 0 && isOpen) {
          setShowRecent(true);
        }
        return;
      }

      setShowRecent(false);
      setIsLoading(true);
      setIsOpen(true);

      try {
        const searchTerm = `%${query.toLowerCase()}%`;

        // Search students (profiles)
        const { data: students } = await supabase
          .from('profiles')
          .select('id, user_id, full_name, university, year_of_study')
          .or(`full_name.ilike.${searchTerm},university.ilike.${searchTerm}`)
          .limit(5);

        // Search courses
        const { data: courses } = await supabase
          .from('academy_courses')
          .select('id, name, institution, is_active')
          .or(`name.ilike.${searchTerm},institution.ilike.${searchTerm}`)
          .limit(5);

        // Search tutor applications
        const { data: applications } = await supabase
          .from('tutor_applications')
          .select('id, full_name, email, status')
          .or(`full_name.ilike.${searchTerm},email.ilike.${searchTerm}`)
          .limit(5);

        const formattedResults: SearchResult[] = [];

        // Add students
        students?.forEach(s => {
          formattedResults.push({
            id: s.user_id,
            type: 'student',
            title: s.full_name || 'Unknown Student',
            subtitle: s.university ? `${s.university} • Year ${s.year_of_study || 1}` : undefined,
          });
        });

        // Add courses
        courses?.forEach(c => {
          formattedResults.push({
            id: c.id,
            type: 'course',
            title: c.name,
            subtitle: c.institution || undefined,
            status: c.is_active ? 'active' : 'inactive',
          });
        });

        // Add applications
        applications?.forEach(a => {
          formattedResults.push({
            id: a.id,
            type: 'application',
            title: a.full_name,
            subtitle: a.email,
            status: a.status,
          });
        });

        setResults(formattedResults);
        setSelectedIndex(0);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [query, isOpen]);

  const saveRecentSearch = (result: SearchResult) => {
    const newSearch: RecentSearch = {
      query: query,
      timestamp: Date.now(),
      result,
    };

    const updated = [
      newSearch,
      ...recentSearches.filter(s => s.result?.id !== result.id)
    ].slice(0, MAX_RECENT_SEARCHES);

    setRecentSearches(updated);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem(RECENT_SEARCHES_KEY);
    haptics.light();
  };

  const removeRecentSearch = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = recentSearches.filter((_, i) => i !== index);
    setRecentSearches(updated);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    haptics.light();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;
    
    const items = showRecent ? recentSearches : results;
    if (items.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % items.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + items.length) % items.length);
        break;
      case 'Enter':
        e.preventDefault();
        if (showRecent && recentSearches[selectedIndex]?.result) {
          handleResultClick(recentSearches[selectedIndex].result!);
        } else if (results[selectedIndex]) {
          handleResultClick(results[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setShowRecent(false);
        inputRef.current?.blur();
        break;
    }
  };

  const handleResultClick = (result: SearchResult) => {
    haptics.light();
    saveRecentSearch(result);
    setIsOpen(false);
    setShowRecent(false);
    setQuery('');

    switch (result.type) {
      case 'student':
        onTabChange?.('students');
        break;
      case 'course':
        onTabChange?.('courses');
        break;
      case 'application':
        navigate('/admin/tutors');
        break;
    }
  };

  const handleQuickAction = async (e: React.MouseEvent, result: SearchResult, action: 'view' | 'edit' | 'approve') => {
    e.stopPropagation();
    haptics.medium();
    saveRecentSearch(result);

    switch (action) {
      case 'view':
        if (result.type === 'student') {
          onTabChange?.('students');
          toast.success(`Viewing ${result.title}'s profile`);
        } else if (result.type === 'application') {
          navigate('/admin/tutors');
          toast.success(`Viewing ${result.title}'s application`);
        }
        break;
      case 'edit':
        if (result.type === 'course') {
          onTabChange?.('courses');
          toast.success(`Editing ${result.title}`);
        }
        break;
      case 'approve':
        if (result.type === 'application' && result.status === 'pending') {
          navigate('/admin/tutors');
          toast.success(`Navigating to approve ${result.title}`);
        }
        break;
    }

    setIsOpen(false);
    setShowRecent(false);
    setQuery('');
  };

  const getIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'student':
        return <User className="w-4 h-4" />;
      case 'course':
        return <BookOpen className="w-4 h-4" />;
      case 'application':
        return <UserCheck className="w-4 h-4" />;
    }
  };

  const getTypeLabel = (type: SearchResult['type']) => {
    switch (type) {
      case 'student':
        return 'Student';
      case 'course':
        return 'Course';
      case 'application':
        return 'Application';
    }
  };

  const getStatusVariant = (status?: string) => {
    switch (status) {
      case 'active':
      case 'approved':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'rejected':
      case 'inactive':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getQuickActions = (result: SearchResult) => {
    switch (result.type) {
      case 'student':
        return (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={(e) => handleQuickAction(e, result, 'view')}
            title="View Profile"
          >
            <Eye className="w-3.5 h-3.5" />
          </Button>
        );
      case 'course':
        return (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={(e) => handleQuickAction(e, result, 'edit')}
            title="Edit Course"
          >
            <Pencil className="w-3.5 h-3.5" />
          </Button>
        );
      case 'application':
        return (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0"
              onClick={(e) => handleQuickAction(e, result, 'view')}
              title="View Application"
            >
              <Eye className="w-3.5 h-3.5" />
            </Button>
            {result.status === 'pending' && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10"
                onClick={(e) => handleQuickAction(e, result, 'approve')}
                title="Approve Application"
              >
                <CheckCircle className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        );
    }
  };

  const handleInputFocus = () => {
    if (query.length >= 2) {
      setIsOpen(true);
      setShowRecent(false);
    } else if (recentSearches.length > 0) {
      setIsOpen(true);
      setShowRecent(true);
    }
  };

  const renderResultItem = (result: SearchResult, index: number, isRecent: boolean = false) => (
    <div
      key={`${result.type}-${result.id}-${isRecent ? 'recent' : 'result'}`}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 transition-colors cursor-pointer group",
        index === selectedIndex 
          ? "bg-accent text-accent-foreground" 
          : "hover:bg-muted/50"
      )}
      onClick={() => handleResultClick(result)}
    >
      <div className={cn(
        "p-1.5 rounded-lg shrink-0",
        result.type === 'student' && "bg-blue-500/10 text-blue-500",
        result.type === 'course' && "bg-emerald-500/10 text-emerald-500",
        result.type === 'application' && "bg-orange-500/10 text-orange-500"
      )}>
        {getIcon(result.type)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm truncate">{result.title}</p>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
            {getTypeLabel(result.type)}
          </Badge>
        </div>
        {result.subtitle && (
          <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
        )}
      </div>
      {result.status && (
        <Badge 
          variant={getStatusVariant(result.status)} 
          className="text-[10px] px-1.5 py-0 shrink-0"
        >
          {result.status}
        </Badge>
      )}
      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
        {getQuickActions(result)}
      </div>
      {isRecent && (
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
          onClick={(e) => removeRecentSearch(index, e)}
          title="Remove from recent"
        >
          <X className="w-3 h-3" />
        </Button>
      )}
    </div>
  );

  return (
    <div ref={containerRef} className="relative w-full max-w-xs">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search students, courses..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          className="pl-9 pr-8 h-9 text-sm bg-muted/50 border-border/50"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setShowRecent(recentSearches.length > 0);
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted text-muted-foreground"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Results Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-50 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : showRecent && recentSearches.length > 0 ? (
            <>
              {/* Recent Searches Header */}
              <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/30">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Recent Searches</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
                  onClick={clearRecentSearches}
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Clear
                </Button>
              </div>
              <ScrollArea className="max-h-64">
                <div className="py-1">
                  {recentSearches.map((recent, index) => 
                    recent.result && renderResultItem(recent.result, index, true)
                  )}
                </div>
              </ScrollArea>
            </>
          ) : results.length === 0 && query.length >= 2 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No results found for "{query}"</p>
            </div>
          ) : results.length > 0 ? (
            <ScrollArea className="max-h-80">
              <div className="py-1">
                {results.map((result, index) => renderResultItem(result, index))}
              </div>
            </ScrollArea>
          ) : null}

          {/* Keyboard hint */}
          {(results.length > 0 || (showRecent && recentSearches.length > 0)) && (
            <div className="px-3 py-2 border-t border-border bg-muted/30">
              <p className="text-[10px] text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <kbd className="px-1 py-0.5 rounded bg-muted text-[9px] font-mono">↑↓</kbd> navigate
                </span>
                <span className="mx-2">•</span>
                <span className="inline-flex items-center gap-1">
                  <kbd className="px-1 py-0.5 rounded bg-muted text-[9px] font-mono">↵</kbd> select
                </span>
                <span className="mx-2">•</span>
                <span className="inline-flex items-center gap-1">
                  <kbd className="px-1 py-0.5 rounded bg-muted text-[9px] font-mono">esc</kbd> close
                </span>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminSearch;
