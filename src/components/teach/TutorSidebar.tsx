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
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { SidebarUserHeader } from '@/components/layout/SidebarUserHeader';

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
  const { signOut } = useAuth();
  const handleClick = (id: string) => {
    onTabChange(id);
    onClose?.();
  };
  const handleLogout = () => {
    signOut();
    onClose?.();
  };

  return (
    <div className="flex flex-col h-full">
      {/* User Header */}
      <SidebarUserHeader
        portalIcon={<GraduationCap className="w-3.5 h-3.5 text-primary" />}
        portalName="Lumina Teach"
        portalSubtitle="Tutor Portal"
      />

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

      {/* Logout */}
      <div className="px-2 py-2 border-t border-border/50">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="font-medium text-sm block">
              Logout
            </span>
             <p className="text-xs truncate text-muted-foreground">
              Sign out of your account
            </p>
          </div>
        </button>
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
