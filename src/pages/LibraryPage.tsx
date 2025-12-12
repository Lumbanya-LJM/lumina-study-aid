import React, { useState } from 'react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { LMVLogo } from '@/components/ui/lmv-logo';
import { 
  Search, 
  Filter,
  FileText,
  Video,
  BookOpen,
  AlertCircle,
  Lock,
  ChevronRight,
  Folder
} from 'lucide-react';
import { cn } from '@/lib/utils';

type ContentType = 'all' | 'papers' | 'videos' | 'cases' | 'alerts';

interface ContentItem {
  id: string;
  title: string;
  type: 'paper' | 'video' | 'case' | 'alert';
  subject: string;
  date: string;
  locked: boolean;
  isNew?: boolean;
}

const LibraryPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ContentType>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const tabs = [
    { id: 'all' as ContentType, label: 'All' },
    { id: 'papers' as ContentType, label: 'Past Papers' },
    { id: 'videos' as ContentType, label: 'Videos' },
    { id: 'cases' as ContentType, label: 'Cases' },
    { id: 'alerts' as ContentType, label: 'Alerts' },
  ];

  const content: ContentItem[] = [
    { id: '1', title: 'Contract Law Final 2023', type: 'paper', subject: 'Contract Law', date: 'Dec 2023', locked: false },
    { id: '2', title: 'Understanding Consideration', type: 'video', subject: 'Contract Law', date: '45 min', locked: false },
    { id: '3', title: 'Donoghue v Stevenson', type: 'case', subject: 'Tort Law', date: '1932', locked: false },
    { id: '4', title: 'New Supreme Court Ruling', type: 'alert', subject: 'Constitutional Law', date: 'Today', locked: false, isNew: true },
    { id: '5', title: 'Criminal Law Midterm 2024', type: 'paper', subject: 'Criminal Law', date: 'Mar 2024', locked: true },
    { id: '6', title: 'R v Brown Analysis', type: 'case', subject: 'Criminal Law', date: '1994', locked: false },
    { id: '7', title: 'Equity Principles Lecture', type: 'video', subject: 'Equity', date: '60 min', locked: true },
    { id: '8', title: 'Property Law Essay Questions', type: 'paper', subject: 'Property Law', date: 'Nov 2023', locked: true },
  ];

  const getIcon = (type: string) => {
    switch (type) {
      case 'paper': return FileText;
      case 'video': return Video;
      case 'case': return BookOpen;
      case 'alert': return AlertCircle;
      default: return Folder;
    }
  };

  const getIconColor = (type: string) => {
    switch (type) {
      case 'paper': return 'bg-primary/10 text-primary';
      case 'video': return 'bg-destructive/10 text-destructive';
      case 'case': return 'bg-warning/10 text-warning';
      case 'alert': return 'bg-success/10 text-success';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const filteredContent = content.filter((item) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'papers') return item.type === 'paper';
    if (activeTab === 'videos') return item.type === 'video';
    if (activeTab === 'cases') return item.type === 'case';
    if (activeTab === 'alerts') return item.type === 'alert';
    return true;
  }).filter((item) => 
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <MobileLayout>
      <div className="px-5 py-6 safe-top">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <LMVLogo size="sm" variant="icon" />
          <h1 className="text-lg font-semibold text-foreground">Content Library</h1>
          <button className="p-2 rounded-xl hover:bg-secondary transition-colors">
            <Filter className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search resources..."
            className="w-full pl-12 pr-4 py-3 rounded-2xl bg-secondary border border-border/50 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground placeholder:text-muted-foreground text-sm transition-all"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar mb-6 -mx-5 px-5">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
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

        {/* Content Grid */}
        <div className="space-y-3">
          {filteredContent.map((item) => {
            const Icon = getIcon(item.type);
            return (
              <button
                key={item.id}
                className={cn(
                  "w-full bg-card rounded-2xl p-4 border shadow-card text-left transition-all hover:shadow-premium",
                  item.locked ? "border-border/50 opacity-75" : "border-border/50"
                )}
              >
                <div className="flex items-center gap-4">
                  <div className={cn("p-3 rounded-xl", getIconColor(item.type))}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground truncate">{item.title}</p>
                      {item.isNew && (
                        <span className="px-2 py-0.5 bg-success/10 text-success text-[10px] font-medium rounded-full">
                          NEW
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {item.subject} · {item.date}
                    </p>
                  </div>
                  {item.locked ? (
                    <div className="p-2 rounded-xl bg-muted">
                      <Lock className="w-4 h-4 text-muted-foreground" />
                    </div>
                  ) : (
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Unlock Premium */}
        {content.some(item => item.locked) && (
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
            <button className="w-full mt-4 bg-primary-foreground text-primary py-3 rounded-xl font-semibold text-sm hover:bg-primary-foreground/90 transition-colors">
              Upgrade Now
            </button>
          </div>
        )}
      </div>
    </MobileLayout>
  );
};

export default LibraryPage;