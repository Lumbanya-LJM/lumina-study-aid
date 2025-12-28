import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  User, 
  BookOpen, 
  UserCheck, 
  Loader2, 
  X,
  GraduationCap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';

interface SearchResult {
  id: string;
  type: 'student' | 'course' | 'application';
  title: string;
  subtitle?: string;
  status?: string;
}

interface AdminSearchProps {
  onTabChange?: (tab: string) => void;
}

export const AdminSearch: React.FC<AdminSearchProps> = ({ onTabChange }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
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
        setIsOpen(false);
        return;
      }

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
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % results.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + results.length) % results.length);
        break;
      case 'Enter':
        e.preventDefault();
        if (results[selectedIndex]) {
          handleResultClick(results[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        inputRef.current?.blur();
        break;
    }
  };

  const handleResultClick = (result: SearchResult) => {
    haptics.light();
    setIsOpen(false);
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
          onFocus={() => query.length >= 2 && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className="pl-9 pr-8 h-9 text-sm bg-muted/50 border-border/50"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setIsOpen(false);
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
          ) : results.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No results found for "{query}"</p>
            </div>
          ) : (
            <ScrollArea className="max-h-80">
              <div className="py-1">
                {results.map((result, index) => (
                  <button
                    key={`${result.type}-${result.id}`}
                    onClick={() => handleResultClick(result)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors",
                      index === selectedIndex 
                        ? "bg-accent text-accent-foreground" 
                        : "hover:bg-muted/50"
                    )}
                  >
                    <div className={cn(
                      "p-1.5 rounded-lg",
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
                  </button>
                ))}
              </div>
            </ScrollArea>
          )}

          {/* Keyboard hint */}
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
        </div>
      )}
    </div>
  );
};

export default AdminSearch;
