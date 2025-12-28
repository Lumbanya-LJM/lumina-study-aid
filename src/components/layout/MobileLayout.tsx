import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Home, MessageCircle, Calendar, BookOpen, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import { StudentSidebar } from './StudentSidebar';
import { FocusStatusBar } from '@/features/focus/FocusStatusBar';

interface MobileLayoutProps {
  children: React.ReactNode;
  showNav?: boolean;
}

const bottomNavItems = [
  { path: '/home', icon: Home, label: 'Home' },
  { path: '/chat', icon: MessageCircle, label: 'Lumina' },
  { path: '/planner', icon: Calendar, label: 'Planner' },
  { path: '/library', icon: BookOpen, label: 'Library' },
  { path: '/profile', icon: User, label: 'Profile' },
];

export const MobileLayout: React.FC<MobileLayoutProps> = ({ children, showNav = true }) => {
  const location = useLocation();

  const handleNavClick = (isCurrentlyActive: boolean) => {
    if (!isCurrentlyActive) {
      haptics.selection();
    }
  };

  return (
    <div className="min-h-screen flex w-full bg-background">
      {/* Desktop Sidebar */}
      <StudentSidebar />

      {/* Focus Status Bar - absolutely positioned */}
      <FocusStatusBar />
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <main className={cn("flex-1 overflow-y-auto no-scrollbar ios-scroll", showNav && "pb-24 lg:pb-0")}>
          <div className="content-container p-4 lg:p-6 touch-manipulation">
            {children}
          </div>
        </main>
        
        {/* Mobile Bottom Navigation */}
        {showNav && (
          <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-t border-border">
            <div className="w-full px-4 pt-2 pb-6 safe-bottom">
              <div className="flex items-center justify-around max-w-2xl mx-auto">
                {bottomNavItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => handleNavClick(isActive)}
                      className={cn(
                        "flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-300 active:scale-90",
                        isActive 
                          ? "text-primary" 
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <div className={cn(
                        "p-2 rounded-xl transition-all duration-300",
                        isActive && "bg-primary/10 scale-110"
                      )}>
                        <item.icon className={cn(
                          "w-5 h-5 transition-all duration-300",
                          isActive && "stroke-[2.5px]"
                        )} />
                      </div>
                      <span className={cn(
                        "text-[10px] font-medium transition-all duration-300",
                        isActive && "font-semibold"
                      )}>
                        {item.label}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </nav>
        )}
      </div>
    </div>
  );
};