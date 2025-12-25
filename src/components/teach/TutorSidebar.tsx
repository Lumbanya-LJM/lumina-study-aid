import React from 'react';
import {
  LayoutDashboard,
  Bell,
  Video,
  FileText,
  Users,
  Clock,
  BarChart3,
  MessageSquare,
  Calendar,
  GraduationCap,
  Settings,
  Menu,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

interface TutorSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const mainNavItems = [
  {
    id: 'overview',
    label: 'Overview',
    icon: LayoutDashboard,
    description: 'Dashboard & stats',
  },
  {
    id: 'updates',
    label: 'Post Updates',
    icon: Bell,
    description: 'Share announcements',
  },
  {
    id: 'live',
    label: 'Live Classes',
    icon: Video,
    description: 'Schedule & manage classes',
  },
  {
    id: 'materials',
    label: 'Course Materials',
    icon: FileText,
    description: 'Upload resources',
  },
  {
    id: 'students',
    label: 'Students',
    icon: Users,
    description: 'View enrolled students',
  },
  {
    id: 'history',
    label: 'Class History',
    icon: Clock,
    description: 'Past classes & recordings',
  },
];

const secondaryNavItems = [
  {
    id: 'analytics',
    label: 'Analytics',
    icon: BarChart3,
    description: 'Performance metrics',
  },
  {
    id: 'messages',
    label: 'Messages',
    icon: MessageSquare,
    description: 'Student communications',
  },
  {
    id: 'schedule',
    label: 'Schedule',
    icon: Calendar,
    description: 'Your teaching calendar',
  },
  {
    id: 'profile',
    label: 'Tutor Profile',
    icon: Settings,
    description: 'Edit your profile',
  },
];

interface SidebarContentProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onClose?: () => void;
}

const SidebarContent: React.FC<SidebarContentProps> = ({
  activeTab,
  onTabChange,
  onClose,
}) => {
  const handleClick = (id: string) => {
    onTabChange(id);
    onClose?.();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-bold text-foreground">Lumina Teach</h2>
            <p className="text-xs text-muted-foreground">Tutor Dashboard</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-2">
        <nav className="px-2 space-y-1">
          {/* Main Section */}
          <div className="px-3 py-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Main</span>
          </div>
          {mainNavItems.map((item) => {
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleClick(item.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted/50 text-muted-foreground hover:text-foreground'
                )}
              >
                <item.icon className={cn('w-5 h-5 shrink-0', isActive && 'text-primary-foreground')} />
                <div className="flex-1 min-w-0">
                  <span className={cn('font-medium text-sm block', isActive && 'text-primary-foreground')}>
                    {item.label}
                  </span>
                  <p className={cn(
                    'text-xs truncate',
                    isActive ? 'text-primary-foreground/80' : 'text-muted-foreground'
                  )}>
                    {item.description}
                  </p>
                </div>
              </button>
            );
          })}

          {/* Tools Section */}
          <div className="px-3 py-2 mt-4">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tools</span>
          </div>
          {secondaryNavItems.map((item) => {
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleClick(item.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted/50 text-muted-foreground hover:text-foreground'
                )}
              >
                <item.icon className={cn('w-5 h-5 shrink-0', isActive && 'text-primary-foreground')} />
                <div className="flex-1 min-w-0">
                  <span className={cn('font-medium text-sm block', isActive && 'text-primary-foreground')}>
                    {item.label}
                  </span>
                  <p className={cn(
                    'text-xs truncate',
                    isActive ? 'text-primary-foreground/80' : 'text-muted-foreground'
                  )}>
                    {item.description}
                  </p>
                </div>
              </button>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 border-t border-border/50">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <GraduationCap className="w-4 h-4" />
          <span>LMV Academy Tutor</span>
        </div>
      </div>
    </div>
  );
};

export const TutorSidebar: React.FC<TutorSidebarProps> = ({
  activeTab,
  onTabChange,
}) => {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      {/* Mobile Trigger */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="lg:hidden fixed bottom-20 right-4 z-50 h-12 w-12 rounded-full shadow-lg bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <SidebarContent
            activeTab={activeTab}
            onTabChange={onTabChange}
            onClose={() => setOpen(false)}
          />
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 border-r border-border/50 bg-card/50 h-full">
        <SidebarContent activeTab={activeTab} onTabChange={onTabChange} />
      </aside>
    </>
  );
};

export default TutorSidebar;
