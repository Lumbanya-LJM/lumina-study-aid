import React from 'react';
import {
  BarChart3,
  BookOpen,
  ClipboardList,
  UserCheck,
  Users,
  Settings,
  FileText,
  Activity,
  Shield,
  Menu,
  LogOut,
  Home,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SidebarUserHeader } from '@/components/layout/SidebarUserHeader';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

interface AdminSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  pendingApplications?: number;
}

const navItems = [
  {
    id: 'overview',
    label: 'Overview',
    icon: BarChart3,
    description: 'Dashboard stats & activity',
  },
  {
    id: 'courses',
    label: 'Course Management',
    icon: BookOpen,
    description: 'Add, edit, remove courses',
  },
  {
    id: 'enrollments',
    label: 'Enrollments',
    icon: ClipboardList,
    description: 'Enroll/unenroll students',
  },
  {
    id: 'tutors',
    label: 'Tutor Activity',
    icon: UserCheck,
    description: 'Monitor tutor productivity',
  },
  {
    id: 'students',
    label: 'Students',
    icon: Users,
    description: 'Manage student accounts',
  },
  {
    id: 'content',
    label: 'Library Content',
    icon: FileText,
    description: 'Manage library resources',
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: Activity,
    description: 'Platform metrics',
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    description: 'Admin management',
  },
];

interface SidebarContentProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  pendingApplications?: number;
  onClose?: () => void;
}

const SidebarContent: React.FC<SidebarContentProps> = ({
  activeTab,
  onTabChange,
  pendingApplications,
  onClose,
}) => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const handleClick = (id: string) => {
    onTabChange(id);
    onClose?.();
  };
  const handleLogout = () => {
    signOut();
    onClose?.();
  };
  const handleExitAdmin = () => {
    navigate('/home');
    onClose?.();
  };


  return (
    <div className="flex flex-col h-full">
      {/* User Header */}
      <SidebarUserHeader
        portalIcon={<Shield className="w-3.5 h-3.5 text-primary" />}
        portalName="Admin Panel"
        portalSubtitle="System Administrator"
      />

      {/* Navigation */}
      <ScrollArea className="flex-1 py-2">
        <nav className="px-2 space-y-1">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            const hasBadge = item.id === 'tutors' && pendingApplications && pendingApplications > 0;

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
                  <div className="flex items-center gap-2">
                    <span className={cn('font-medium text-sm', isActive && 'text-primary-foreground')}>
                      {item.label}
                    </span>
                    {hasBadge && (
                      <span className="px-1.5 py-0.5 text-xs font-bold rounded-full bg-destructive text-destructive-foreground">
                        {pendingApplications}
                      </span>
                    )}
                  </div>
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

      {/* Exit & Logout */}
      <div className="px-2 py-2 border-t border-border/50 space-y-1">
        <button
          onClick={handleExitAdmin}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all hover:bg-muted/50 text-muted-foreground hover:text-foreground"
        >
          <Home className="w-5 h-5 shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="font-medium text-sm block">
              Exit Admin
            </span>
             <p className="text-xs truncate text-muted-foreground">
              Return to main dashboard
            </p>
          </div>
        </button>

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

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  activeTab,
  onTabChange,
  pendingApplications,
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
            pendingApplications={pendingApplications}
            onClose={() => setOpen(false)}
          />
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 border-r border-border/50 bg-card/50 h-full">
        <SidebarContent
          activeTab={activeTab}
          onTabChange={onTabChange}
          pendingApplications={pendingApplications}
        />
      </aside>
    </>
  );
};

export default AdminSidebar;
