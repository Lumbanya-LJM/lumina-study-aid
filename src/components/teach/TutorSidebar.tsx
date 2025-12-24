import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { RoleSwitcher } from '@/components/layout/RoleSwitcher';
import {
  GraduationCap,
  LayoutDashboard,
  BookOpen,
  Users,
  Bell,
  Video,
  FileText,
  BarChart3,
  MessageSquare,
  Settings,
  LogOut,
  Clock,
  Calendar,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TutorSidebarProps {
  onTabChange?: (tab: string) => void;
  activeTab?: string;
}

const mainNavItems = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'updates', label: 'Post Updates', icon: Bell },
  { id: 'live', label: 'Live Classes', icon: Video },
  { id: 'materials', label: 'Course Materials', icon: FileText },
  { id: 'students', label: 'Students', icon: Users },
  { id: 'history', label: 'Class History', icon: Clock },
];

const secondaryNavItems = [
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'messages', label: 'Messages', icon: MessageSquare },
  { id: 'schedule', label: 'Schedule', icon: Calendar },
  { id: 'profile', label: 'Tutor Profile', icon: GraduationCap },
];

export const TutorSidebar: React.FC<TutorSidebarProps> = ({ onTabChange, activeTab = 'overview' }) => {
  const { user, signOut } = useAuth();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';

  const handleNavClick = (id: string) => {
    onTabChange?.(id);
  };

  const getUserInitials = () => {
    if (!user?.email) return 'T';
    return user.email.charAt(0).toUpperCase();
  };

  return (
    <Sidebar 
      className={cn(
        "border-r border-border/50 bg-card",
        collapsed ? "w-16" : "w-64"
      )}
      collapsible="icon"
    >
      <SidebarHeader className="p-4 border-b border-border/50">
        <div className={cn(
          "flex items-center gap-3",
          collapsed && "justify-center"
        )}>
          <div className="p-2 bg-primary/10 rounded-xl shrink-0">
            <GraduationCap className="w-6 h-6 text-primary" />
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-foreground truncate">Lumina Teach</h1>
              <p className="text-xs text-muted-foreground">Tutor Dashboard</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4">
        {/* Main Navigation */}
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel className="text-xs text-muted-foreground px-3 mb-2">Main</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => handleNavClick(item.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors cursor-pointer",
                      activeTab === item.id
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                    tooltip={collapsed ? item.label : undefined}
                  >
                    <item.icon className="w-5 h-5 shrink-0" />
                    {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Secondary Navigation */}
        <SidebarGroup className="mt-6">
          {!collapsed && <SidebarGroupLabel className="text-xs text-muted-foreground px-3 mb-2">Tools</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {secondaryNavItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => handleNavClick(item.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors cursor-pointer",
                      activeTab === item.id
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                    tooltip={collapsed ? item.label : undefined}
                  >
                    <item.icon className="w-5 h-5 shrink-0" />
                    {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-border/50">
        {/* Role Switcher */}
        {!collapsed && (
          <div className="mb-4">
            <RoleSwitcher />
          </div>
        )}

        {/* User Profile */}
        <div className={cn(
          "flex items-center gap-3",
          collapsed && "justify-center"
        )}>
          <Avatar className="w-9 h-9 shrink-0">
            <AvatarImage src="" />
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
              {getUserInitials()}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {user?.email?.split('@')[0] || 'Tutor'}
              </p>
              <p className="text-xs text-muted-foreground">Tutor</p>
            </div>
          )}
        </div>

        {/* Sign Out */}
        {!collapsed && (
          <Button
            variant="ghost"
            size="sm"
            onClick={signOut}
            className="w-full mt-3 text-muted-foreground hover:text-foreground justify-start"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        )}
      </SidebarFooter>
    </Sidebar>
  );
};
