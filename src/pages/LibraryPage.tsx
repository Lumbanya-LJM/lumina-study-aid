import React, { useState, useEffect, useMemo } from 'react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { LMVLogo } from '@/components/ui/lmv-logo';
import { supabase } from '@/integrations/supabase/client';
import { useAdmin } from '@/hooks/useAdmin';
import { useNavigate } from 'react-router-dom';
import { ZambiaLiiIntegration } from '@/components/library/ZambiaLiiIntegration';
import { CaseSummarizer } from '@/components/library/CaseSummarizer';
import { useSchool } from '@/hooks/useSchool';
import { getLibraryTabs } from '@/config/luminaPrompts';

import { 
  Search, 
  Filter,
  FileText,
  Video,
  BookOpen,
  AlertCircle,
  Lock,
  ChevronRight,
  Folder,
  ExternalLink,
  Settings,
  Scale,
  Sparkles,
  X,
  Bookmark
} from 'lucide-react';
import { cn } from '@/lib/utils';

type ContentType = 'all' | 'papers' | 'videos' | 'cases' | 'alerts' | 'summaries' | 'zambialii' | 'summarizer';

interface ContentItem {
  id: string;
  title: string;
  description: string | null;
  content_type: string;
  subject: string;
  year: string | null;
  citation: string | null;
  court: string | null;
  file_url: string | null;
  external_url: string | null;
  content_text: string | null;
  is_premium: boolean;
  created_at: string;
}

const LibraryPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ContentType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [content, setContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAdmin } = useAdmin();
  const navigate = useNavigate();
  const { school } = useSchool();

  // Get school-specific tabs
  const tabs = useMemo(() => getLibraryTabs(school), [school]);

  // Check if law school for law-specific features
  const isLawSchool = school === 'law';

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      const { data, error } = await supabase
        .from('library_content')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContent(data || []);
    } catch (error) {
      console.error('Error fetching content:', error);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'paper': return FileText;
      case 'video': return Video;
      case 'case': return BookOpen;
      case 'summary': return FileText;
      case 'alert': return AlertCircle;
      default: return Folder;
    }
  };

  const getIconColor = (type: string) => {
    switch (type) {
      case 'paper': return 'bg-primary/10 text-primary';
      case 'video': return 'bg-destructive/10 text-destructive';
      case 'case': return 'bg-warning/10 text-warning';
      case 'summary': return 'bg-success/10 text-success';
      case 'alert': return 'bg-accent/10 text-accent-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const filteredContent = content.filter((item) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'papers') return item.content_type === 'paper';
    if (activeTab === 'videos') return item.content_type === 'video';
    if (activeTab === 'cases') return item.content_type === 'case';
    if (activeTab === 'summaries') return item.content_type === 'summary';
    if (activeTab === 'alerts') return item.content_type === 'alert';
    return true;
  }).filter((item) => 
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.citation && item.citation.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleContentClick = (item: ContentItem) => {
    if (item.external_url) {
      window.open(item.external_url, '_blank');
    } else if (item.file_url) {
      window.open(item.file_url, '_blank');
    }
    // For items with content_text, could open a modal or detail page
  };

  return (
    <MobileLayout>
      <div className="py-6 safe-top">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <LMVLogo size="sm" variant="icon" />
          <h1 className="text-lg font-semibold text-foreground">Content Library</h1>
          {isAdmin ? (
            <button 
              onClick={() => navigate('/admin/content')}
              className="p-2 rounded-xl hover:bg-secondary transition-colors"
            >
              <Settings className="w-5 h-5 text-primary" />
            </button>
          ) : (
            <button className="p-2 rounded-xl hover:bg-secondary transition-colors">
              <Filter className="w-5 h-5 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Quick Links */}
        <div className="flex gap-3 mb-6">
          {/* Saved Research Quick Link */}
          <button
            onClick={() => navigate('/saved-research')}
            className="flex-1 flex items-center gap-3 bg-secondary border border-border/50 rounded-2xl p-4 hover:bg-secondary/80 transition-colors"
          >
            <div className="p-2 rounded-xl bg-primary/10">
              <Bookmark className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-medium text-foreground">Saved Research</p>
              <p className="text-xs text-muted-foreground">Your bookmarked findings</p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* ZambiaLii Quick Link - only show for law school and when not on ZambiaLII tab */}
        {isLawSchool && activeTab !== 'zambialii' && (
          <button
            onClick={() => setActiveTab('zambialii')}
            className="w-full flex items-center gap-3 bg-primary/10 border border-primary/20 rounded-2xl p-4 mb-6 hover:bg-primary/15 transition-colors"
          >
            <div className="p-2 rounded-xl bg-primary/20">
              <Scale className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-medium text-foreground">ZambiaLII</p>
              <p className="text-xs text-muted-foreground">Browse 9,495+ Zambian court judgments</p>
            </div>
            <ChevronRight className="w-5 h-5 text-primary" />
          </button>
        )}

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search cases, papers, citations..."
            className="w-full pl-12 pr-4 py-3 rounded-2xl bg-secondary border border-border/50 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground placeholder:text-muted-foreground text-sm transition-all"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar mb-6 -mx-5 px-5">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ContentType)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                activeTab === tab.id
                  ? "gradient-primary text-primary-foreground shadow-glow"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>


        {/* Tab Content */}
        {activeTab === 'summarizer' ? (
          <CaseSummarizer />
        ) : activeTab === 'zambialii' && isLawSchool ? (
          <ZambiaLiiIntegration />
        ) : loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : (
          <>
            {/* Content Grid */}
            <div className="space-y-3">
              {filteredContent.map((item) => {
                const Icon = getIcon(item.content_type);
                const isNew = new Date(item.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                
                return (
                  <button
                    key={item.id}
                    onClick={() => handleContentClick(item)}
                    className={cn(
                      "w-full bg-card rounded-2xl p-4 border shadow-card text-left transition-all hover:shadow-premium",
                      item.is_premium ? "border-warning/30" : "border-border/50"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn("p-3 rounded-xl", getIconColor(item.content_type))}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-foreground truncate">{item.title}</p>
                          {isNew && (
                            <span className="px-2 py-0.5 bg-success/10 text-success text-[10px] font-medium rounded-full">
                              NEW
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {item.subject} {item.year && `· ${item.year}`}
                        </p>
                        {item.citation && (
                          <p className="text-xs text-primary mt-1 truncate">{item.citation}</p>
                        )}
                        {item.court && (
                          <p className="text-xs text-muted-foreground truncate">{item.court}</p>
                        )}
                      </div>
                      {item.is_premium ? (
                        <div className="p-2 rounded-xl bg-warning/10">
                          <Lock className="w-4 h-4 text-warning" />
                        </div>
                      ) : item.external_url ? (
                        <ExternalLink className="w-5 h-5 text-primary" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Empty State */}
            {filteredContent.length === 0 && (
              <div className="text-center py-12">
                <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-foreground font-medium">No content found</p>
                <p className="text-sm text-muted-foreground">
                  {searchQuery ? 'Try a different search term' : 'Content will appear here soon'}
                </p>
              </div>
            )}
          </>
        )}

        {/* Premium Upgrade - Hidden in dev mode */}
        {/* DEV MODE: Premium upsell disabled
        {content.some(item => item.is_premium) && (
          <div className="mt-6 gradient-primary rounded-2xl p-5 shadow-glow">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary-foreground/20 flex items-center justify-center">
                <Lock className="w-6 h-6 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-primary-foreground">Unlock Premium Content</p>
                <p className="text-xs text-primary-foreground/80">Access all past papers, lectures & case summaries</p>
              </div>
            </div>
            <button 
              onClick={() => navigate('/subscription')}
              className="w-full mt-4 bg-primary-foreground text-primary py-3 rounded-xl font-semibold text-sm hover:bg-primary-foreground/90 transition-colors"
            >
              Upgrade Now
            </button>
          </div>
        )}
        */}
      </div>
    </MobileLayout>
  );
};

export default LibraryPage;
