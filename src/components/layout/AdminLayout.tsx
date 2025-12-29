import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAdmin } from '@/hooks/useAdmin';
import { RoleSwitcher } from '@/components/layout/RoleSwitcher';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminSearch } from '@/components/admin/AdminSearch';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Shield, ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useSchoolTheme } from '@/hooks/useSchoolTheme';

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  pendingApplications?: number;
  showSidebar?: boolean;
  showBackButton?: boolean;
  mobileTitle?: string;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  children,
  title,
  subtitle,
  activeTab = 'overview',
  onTabChange,
  pendingApplications = 0,
  showSidebar = true,
  showBackButton = false,
  mobileTitle,
}) => {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const navigate = useNavigate();
  
  // Apply school-specific theme colors
  useSchoolTheme();

  // Loading state
  if (adminLoading) {
    return (
      <div className="min-h-screen flex w-full bg-background">
        {showSidebar && (
          <div className="hidden lg:block w-64 border-r border-border/50 p-4">
            <Skeleton className="h-16 mb-4" />
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12" />)}
            </div>
          </div>
        )}
        <div className="flex-1 p-4 sm:p-6 lg:p-8">
          <Skeleton className="h-16 w-full rounded-2xl mb-6" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-24" />)}
          </div>
        </div>
      </div>
    );
  }

  // Access denied state
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex w-full bg-background items-center justify-center">
        <div className="flex flex-col items-center justify-center p-5 text-center">
          <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
            <AlertCircle className="w-10 h-10 text-destructive" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Access Denied</h2>
          <p className="text-muted-foreground">
            You don't have permission to access the admin dashboard.
          </p>
          <Link to="/home" className="mt-4 text-primary hover:underline">
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex w-full bg-background">
      {/* Sidebar */}
      {showSidebar && onTabChange && (
        <AdminSidebar
          activeTab={activeTab}
          onTabChange={onTabChange}
          pendingApplications={pendingApplications}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 min-w-0 overflow-auto">
        <div className="p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8 max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3 min-w-0">
              {showBackButton ? (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate(-1)}
                  className="text-muted-foreground hover:text-foreground shrink-0"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              ) : (
                <Link to="/profile" className="text-muted-foreground hover:text-foreground lg:hidden shrink-0">
                  <ArrowLeft className="w-5 h-5" />
                </Link>
              )}
              <div className="hidden lg:flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                  <Shield className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-xl font-bold text-foreground truncate">{title}</h1>
                  {subtitle && (
                    <p className="text-sm text-muted-foreground truncate">{subtitle}</p>
                  )}
                </div>
              </div>
              <h1 className="text-lg font-bold lg:hidden truncate">{mobileTitle || title}</h1>
            </div>

            {/* Search and Role Switcher */}
            <div className="flex items-center gap-3">
              {showSidebar && (
                <div className="hidden sm:block">
                  <AdminSearch onTabChange={onTabChange} />
                </div>
              )}
              <RoleSwitcher />
            </div>
          </div>

          {/* Mobile Search Bar */}
          {showSidebar && (
            <div className="sm:hidden mb-4">
              <AdminSearch onTabChange={onTabChange} />
            </div>
          )}

          {/* Mobile Tab Indicator */}
          {showSidebar && activeTab && (
            <div className="lg:hidden mb-4">
              <Badge variant="secondary" className="text-xs">
                {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
              </Badge>
            </div>
          )}

          {/* Content */}
          {children}
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
