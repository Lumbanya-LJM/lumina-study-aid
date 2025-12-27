import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import {
  Home,
  MessageCircle,
  Calendar,
  BookOpen,
  User,
  GraduationCap,
  Trophy,
  Brain,
  FileText,
  Target,
  Menu,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { haptics } from '@/lib/haptics';
import { SidebarUserHeader } from '@/components/layout/SidebarUserHeader';

const navItems = [
  {
    id: 'home',
    path: '/home',
    label: 'Home',
    icon: Home,
    description: 'Dashboard & quick actions',
  },
  {
    id: 'chat',
    path: '/chat',
    label: 'Lumina AI',
    icon: MessageCircle,
    description: 'Your AI study buddy',
  },
  {
    id: 'academy',
    path: '/academy',
    label: 'Academy',
    icon: GraduationCap,
    description: 'Live classes & courses',
  },
  {
    id: 'planner',
    path: '/planner',
    label: 'Planner',
    icon: Calendar,
    description: 'Schedule & tasks',
  },
  {
    id: 'library',
    path: '/library',
    label: 'Library',
    icon: BookOpen,
    description: 'Study materials & cases',
  },
  {
    id: 'flashcards',
    path: '/flashcards',
    label: 'Flashcards',
    icon: Brain,
    description: 'Spaced repetition cards',
  },
  {
    id: 'quiz',
    path: '/quiz',
    label: 'Quizzes',
    icon: FileText,
    description: 'Test your knowledge',
  },
  {
    id: 'focus',
    path: '/focus',
    label: 'Focus Mode',
    icon: Target,
    description: 'Deep study sessions',
  },
  {
    id: 'achievements',
    path: '/achievements',
    label: 'Achievements',
    icon: Trophy,
    description: 'Badges & progress',
  },
  {
    id: 'profile',
    path: '/profile',
    label: 'Profile',
    icon: User,
    description: 'Your account settings',
  },
];

interface SidebarContentProps {
  currentPath: string;
  onClose?: () => void;
}

const SidebarContent: React.FC<SidebarContentProps> = ({
  currentPath,
  onClose,
}) => {
  const { signOut } = useAuth();
  const handleClick = () => {
    haptics.selection();
    onClose?.();
  };

  const handleLogout = () => {
    signOut();
    onClose?.();
    haptics.success();
  };

  return (
    <div className="flex flex-col h-full">
      {/* User Header */}
      <SidebarUserHeader
        portalIcon={<GraduationCap className="w-3.5 h-3.5 text-primary" />}
        portalName="Luminary Study"
        portalSubtitle="Student Portal"
      />

      {/* Navigation */}
      <ScrollArea className="flex-1 py-2">
        <nav className="px-2 space-y-1">
          {navItems.map((item) => {
            const isActive = currentPath === item.path;

            return (
              <Link
                key={item.id}
                to={item.path}
                onClick={handleClick}
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
              </Link>
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

export const StudentSidebar: React.FC = () => {
  const [open, setOpen] = React.useState(false);
  const location = useLocation();

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
            currentPath={location.pathname}
            onClose={() => setOpen(false)}
          />
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 border-r border-border/50 bg-card/50 h-full">
        <SidebarContent currentPath={location.pathname} />
      </aside>
    </>
  );
};

export default StudentSidebar;
