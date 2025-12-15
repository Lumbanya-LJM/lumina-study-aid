import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Home, MessageCircle, Calendar, BookOpen, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileLayoutProps {
  children: React.ReactNode;
  showNav?: boolean;
}

const navItems = [
  { path: '/home', icon: Home, label: 'Home' },
  { path: '/chat', icon: MessageCircle, label: 'Lumina' },
  { path: '/planner', icon: Calendar, label: 'Planner' },
  { path: '/library', icon: BookOpen, label: 'Library' },
  { path: '/profile', icon: User, label: 'Profile' },
];

export const MobileLayout: React.FC<MobileLayoutProps> = ({ children, showNav = true }) => {
  const location = useLocation();

  return (
    <div className="mobile-container bg-background min-h-screen flex flex-col">
      <main className={cn("flex-1 overflow-y-auto no-scrollbar", showNav && "pb-24")}>
        {children}
      </main>
      
      {showNav && (
        <nav className="fixed bottom-0 left-0 right-0 z-50">
          <div className="mobile-container">
            <div className="glass border-t border-border px-2 pt-2 pb-6 safe-bottom">
              <div className="flex items-center justify-around">
                {navItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
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
          </div>
        </nav>
      )}
    </div>
  );
};