import React, { useState, useCallback } from 'react';
import { 
  Search, 
  ExternalLink, 
  Scale, 
  Calendar,
  Building,
  ChevronRight,
  Loader2,
  AlertCircle,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// ZambiaLii court codes and their full names
const COURTS = [
  { code: 'all', name: 'All Courts', path: '/judgments/all/' },
  { code: 'ZMSC', name: 'Supreme Court', path: '/judgments/ZMSC/' },
  { code: 'ZMCA', name: 'Court of Appeal', path: '/judgments/ZMCA/' },
  { code: 'ZMCC', name: 'Constitutional Court', path: '/judgments/ZMCC/' },
  { code: 'ZMHC', name: 'High Court', path: '/judgments/ZMHC/' },
  { code: 'ZMIC', name: 'Industrial Relations Court', path: '/judgments/ZMIC/' },
];

// Sample recent cases from ZambiaLii (curated for the app)
const FEATURED_CASES = [
  {
    id: '1',
    title: 'Legal Resources Foundation Limited v The Attorney General',
    citation: '(2025/CCZ/0021) [2025] ZMCC 30',
    date: '11 December 2025',
    court: 'Constitutional Court of Zambia',
    url: 'https://zambialii.org/akn/zm/judgment/zmcc/2025/30/eng@2025-12-11'
  },
  {
    id: '2',
    title: 'Munir Zulu and Anor v Attorney General and Ors',
    citation: '(2025/CCZ/009) [2025] ZMCC 31',
    date: '10 December 2025',
    court: 'Constitutional Court of Zambia',
    url: 'https://zambialii.org/akn/zm/judgment/zmcc/2025/31/eng@2025-12-10'
  },
  {
    id: '3',
    title: 'Law Association of Zambia and Ors v Attorney General and Ors',
    citation: '(2025/CCZ/0029) [2025] ZMCC 29',
    date: '8 December 2025',
    court: 'Constitutional Court of Zambia',
    url: 'https://zambialii.org/akn/zm/judgment/zmcc/2025/29/eng@2025-12-08'
  },
  {
    id: '4',
    title: 'Charles Mpundu v Food Reserve Agency',
    citation: '(SP No. 71/ 2024) [2025] ZMCA 170',
    date: '5 December 2025',
    court: 'Court of Appeal of Zambia',
    url: 'https://zambialii.org/akn/zm/judgment/zmca/2025/170/eng@2025-12-05'
  },
  {
    id: '5',
    title: 'FQM Trident Limited v Mukuka Mumba',
    citation: '(Appeal No. 91/2024) [2025] ZMCA 165',
    date: '5 December 2025',
    court: 'Court of Appeal of Zambia',
    url: 'https://zambialii.org/akn/zm/judgment/zmca/2025/165/eng@2025-12-05'
  },
  {
    id: '6',
    title: 'Brian Mundubile and Anor v Hakainde Hichilema and Anor',
    citation: '(2025/CCZ/0026) [2025] ZMCC 28',
    date: '5 December 2025',
    court: 'Constitutional Court of Zambia',
    url: 'https://zambialii.org/akn/zm/judgment/zmcc/2025/28/eng@2025-12-05'
  },
];

interface ZambiaLiiIntegrationProps {
  onClose?: () => void;
  isModal?: boolean;
}

export const ZambiaLiiIntegration: React.FC<ZambiaLiiIntegrationProps> = ({ 
  onClose,
  isModal = false 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourt, setSelectedCourt] = useState('all');
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = useCallback(() => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    
    // Construct ZambiaLii search URL
    const searchUrl = `https://zambialii.org/search/?q=${encodeURIComponent(searchQuery)}&nature=Judgment`;
    
    // Open in new tab
    window.open(searchUrl, '_blank');
    
    setTimeout(() => setIsSearching(false), 500);
  }, [searchQuery]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const openCourt = (court: typeof COURTS[0]) => {
    window.open(`https://zambialii.org${court.path}`, '_blank');
  };

  const openCase = (caseItem: typeof FEATURED_CASES[0]) => {
    window.open(caseItem.url, '_blank');
  };

  return (
    <div className={cn(
      "bg-card rounded-2xl border border-border/50 shadow-card overflow-hidden",
      isModal && "max-h-[80vh] overflow-y-auto"
    )}>
      {/* Header */}
      <div className="gradient-primary p-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary-foreground/10 rounded-full blur-3xl" />
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary-foreground/20 flex items-center justify-center">
              <Scale className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-primary-foreground">ZambiaLII</h2>
              <p className="text-xs text-primary-foreground/80">Zambia Legal Information Institute</p>
            </div>
          </div>
          {isModal && onClose && (
            <button 
              onClick={onClose}
              className="p-2 rounded-xl bg-primary-foreground/20 hover:bg-primary-foreground/30 transition-colors"
            >
              <X className="w-5 h-5 text-primary-foreground" />
            </button>
          )}
        </div>
        
        {/* Search Bar */}
        <div className="mt-4 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary-foreground/60" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Search cases, legislation..."
            className="pl-12 pr-24 py-3 bg-primary-foreground/20 border-primary-foreground/30 text-primary-foreground placeholder:text-primary-foreground/60 focus:border-primary-foreground/50 rounded-xl"
          />
          <Button
            onClick={handleSearch}
            disabled={isSearching || !searchQuery.trim()}
            size="sm"
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-primary-foreground text-primary hover:bg-primary-foreground/90"
          >
            {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
          </Button>
        </div>
      </div>

      {/* Courts Grid */}
      <div className="p-5 border-b border-border/50">
        <h3 className="text-sm font-semibold text-foreground mb-3">Browse by Court</h3>
        <div className="grid grid-cols-2 gap-2">
          {COURTS.map((court) => (
            <button
              key={court.code}
              onClick={() => openCourt(court)}
              className={cn(
                "flex items-center gap-2 p-3 rounded-xl border transition-all text-left",
                "bg-secondary/50 border-border/50 hover:bg-secondary hover:border-primary/30"
              )}
            >
              <Building className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-foreground truncate">{court.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Featured Cases */}
      <div className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground">Recent Judgments</h3>
          <a 
            href="https://zambialii.org/judgments/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            View all <ExternalLink className="w-3 h-3" />
          </a>
        </div>
        
        <div className="space-y-2">
          {FEATURED_CASES.map((caseItem) => (
            <button
              key={caseItem.id}
              onClick={() => openCase(caseItem)}
              className="w-full bg-secondary/30 rounded-xl p-3 text-left hover:bg-secondary/50 transition-all border border-border/30 hover:border-primary/30"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground line-clamp-2">
                    {caseItem.title}
                  </p>
                  <p className="text-xs text-primary mt-1">{caseItem.citation}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      {caseItem.date}
                    </span>
                    <span className="text-xs text-muted-foreground truncate">
                      {caseItem.court.replace(' of Zambia', '')}
                    </span>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Footer Info */}
      <div className="px-5 pb-5">
        <div className="flex items-start gap-2 p-3 bg-primary/5 rounded-xl border border-primary/10">
          <AlertCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            ZambiaLII provides free access to over 9,495 court judgments, legislation, 
            and legal information. Content opens in a new tab on zambialii.org.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ZambiaLiiIntegration;
