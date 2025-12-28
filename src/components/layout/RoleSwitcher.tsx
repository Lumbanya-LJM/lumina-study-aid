import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Shield, GraduationCap, BookOpen, ChevronDown, Check, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UserRoles {
  isAdmin: boolean;
  isTutor: boolean;
}

type RoleView = 'admin' | 'tutor' | 'student';

export const RoleSwitcher: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [roles, setRoles] = useState<UserRoles>({ isAdmin: false, isTutor: false });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkRoles = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        const [isAdminRes, isTutorRes] = await Promise.all([
          supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' }),
          supabase.rpc('has_role', { _user_id: user.id, _role: 'moderator' }),
        ]);
        setRoles({
          isAdmin: Boolean(isAdminRes.data),
          isTutor: Boolean(isTutorRes.data),
        });
      } catch (error) {
        console.error('Error checking roles:', error);
      } finally {
        setLoading(false);
      }
    };

    checkRoles();
  }, [user?.id]);

  // Don't show if user only has one role
  const hasMultipleRoles = roles.isAdmin || roles.isTutor;
  if (loading || !hasMultipleRoles) return null;

  const getCurrentView = (): RoleView => {
    if (location.pathname.startsWith('/admin')) return 'admin';
    if (location.pathname.startsWith('/teach')) return 'tutor';
    return 'student';
  };

  const currentView = getCurrentView();

  const roleOptions: { view: RoleView; label: string; icon: React.ElementType; path: string; available: boolean }[] = [
    { view: 'admin', label: 'Admin Portal', icon: Shield, path: '/admin', available: roles.isAdmin },
    { view: 'tutor', label: 'Tutor Dashboard', icon: GraduationCap, path: '/teach', available: roles.isTutor },
    { view: 'student', label: 'Student App', icon: BookOpen, path: '/home', available: true },
  ];

  const availableOptions = roleOptions.filter(opt => opt.available);
  const currentOption = roleOptions.find(opt => opt.view === currentView) || availableOptions[0];

  const handleSwitch = (path: string) => {
    navigate(path);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-2 bg-background/50 border-border/50 hover:bg-background"
        >
          <currentOption.icon className="w-4 h-4" />
          <span className="hidden sm:inline">{currentOption.label}</span>
          <ChevronDown className="w-3 h-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Switch View</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {availableOptions.map((option) => (
          <DropdownMenuItem
            key={option.view}
            onClick={() => handleSwitch(option.path)}
            className={cn(
              "flex items-center gap-3 cursor-pointer",
              currentView === option.view && "bg-primary/10"
            )}
          >
            <option.icon className={cn(
              "w-4 h-4",
              currentView === option.view ? "text-primary" : "text-muted-foreground"
            )} />
            <span className={cn(
              currentView === option.view && "font-medium text-primary"
            )}>
              {option.label}
            </span>
            {currentView === option.view && (
              <Check className="w-4 h-4 ml-auto text-primary" />
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} className="flex items-center gap-3 cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive">
          <LogOut className="w-4 h-4" />
          <span>Log Out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
