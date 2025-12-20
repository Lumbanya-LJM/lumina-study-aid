import React, { useState, useCallback } from 'react';
import { Scale, Search, ExternalLink, Loader2, X, Building, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface ZambiaLiiChatSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onSearchWithLumina: (query: string) => void;
}

const COURTS = [
  { code: 'ZMSC', name: 'Supreme Court', path: 'supreme-court' },
  { code: 'ZMCA', name: 'Court of Appeal', path: 'court-appeal' },
  { code: 'ZMCC', name: 'Constitutional Court', path: 'constitutional-court' },
  { code: 'ZMHC', name: 'High Court', path: 'high-court' },
];

const QUICK_SEARCHES = [
  { label: 'Constitutional rights cases', query: 'constitutional rights Zambia' },
  { label: 'Land law judgments', query: 'land ownership property Zambia' },
  { label: 'Criminal law precedents', query: 'criminal law murder theft Zambia' },
  { label: 'Contract disputes', query: 'contract breach agreement Zambia' },
  { label: 'Employment cases', query: 'employment dismissal labour Zambia' },
];

export const ZambiaLiiChatSearch: React.FC<ZambiaLiiChatSearchProps> = ({
  isOpen,
  onClose,
  onSearchWithLumina,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourt, setSelectedCourt] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const getZambiaLiiUrl = useCallback((query: string, court?: string) => {
    const encodedQuery = encodeURIComponent(query);
    if (court) {
      return `https://zambialii.org/zm/judgment/${court}?q=${encodedQuery}`;
    }
    return `https://zambialii.org/search/?q=${encodedQuery}&nature=Judgment`;
  }, []);

  const handleDirectSearch = useCallback(() => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    const url = getZambiaLiiUrl(searchQuery, selectedCourt || undefined);
    window.open(url, '_blank');
    setTimeout(() => setIsSearching(false), 500);
  }, [searchQuery, selectedCourt, getZambiaLiiUrl]);

  const handleLuminaSearch = useCallback(() => {
    if (!searchQuery.trim()) return;
    
    const luminaQuery = `Search ZambiaLII for: "${searchQuery}"${selectedCourt ? ` in the ${COURTS.find(c => c.path === selectedCourt)?.name}` : ''}. Provide case citations with direct ZambiaLII links.`;
    onSearchWithLumina(luminaQuery);
    onClose();
    setSearchQuery('');
    setSelectedCourt(null);
  }, [searchQuery, selectedCourt, onSearchWithLumina, onClose]);

  const handleQuickSearch = useCallback((query: string) => {
    const luminaQuery = `Find Zambian cases about: "${query}". Provide the most relevant cases with citations and ZambiaLII links.`;
    onSearchWithLumina(luminaQuery);
    onClose();
  }, [onSearchWithLumina, onClose]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleLuminaSearch();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10">
              <Scale className="w-5 h-5 text-primary" />
            </div>
            <div>
              <span className="text-lg font-semibold">ZambiaLII Search</span>
              <p className="text-xs font-normal text-muted-foreground">Find cases, legislation & judgments</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Search case name, citation, or topic..."
              className="pl-10 pr-4"
            />
          </div>

          {/* Court Filter */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Filter by Court (optional)</p>
            <div className="flex flex-wrap gap-2">
              {COURTS.map((court) => (
                <button
                  key={court.code}
                  onClick={() => setSelectedCourt(selectedCourt === court.path ? null : court.path)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                    selectedCourt === court.path
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  )}
                >
                  {court.name}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={handleLuminaSearch}
              disabled={!searchQuery.trim() || isSearching}
              className="flex-1"
            >
              <Scale className="w-4 h-4 mr-2" />
              Ask Lumina
            </Button>
            <Button
              onClick={handleDirectSearch}
              disabled={!searchQuery.trim() || isSearching}
              variant="outline"
              className="flex-1"
            >
              {isSearching ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <ExternalLink className="w-4 h-4 mr-2" />
              )}
              Open ZambiaLII
            </Button>
          </div>

          {/* Quick Searches */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Quick Searches</p>
            <div className="space-y-1.5">
              {QUICK_SEARCHES.map((item) => (
                <button
                  key={item.query}
                  onClick={() => handleQuickSearch(item.query)}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors text-left group"
                >
                  <span className="text-sm text-foreground">{item.label}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </button>
              ))}
            </div>
          </div>

          {/* Direct Links */}
          <div className="pt-2 border-t border-border/50">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Browse ZambiaLII directly</p>
              <div className="flex gap-2">
                <a
                  href="https://zambialii.org/judgments/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  Judgments <ExternalLink className="w-3 h-3" />
                </a>
                <a
                  href="https://zambialii.org/legislation/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  Legislation <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ZambiaLiiChatSearch;
