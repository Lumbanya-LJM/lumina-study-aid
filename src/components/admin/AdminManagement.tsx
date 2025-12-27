import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  UserPlus, 
  Shield, 
  Trash2, 
  Loader2, 
  AlertCircle,
  CheckCircle,
  User
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdminUser {
  user_id: string;
  email: string;
  full_name: string | null;
  created_at: string;
}

export const AdminManagement: React.FC = () => {
  const { toast } = useToast();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const loadAdmins = useCallback(async () => {
    setLoading(true);
    try {
      // Get all admin roles
      const { data: adminRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, created_at')
        .eq('role', 'admin');

      if (rolesError) throw rolesError;

      if (!adminRoles || adminRoles.length === 0) {
        setAdmins([]);
        return;
      }

      // Get profile info for each admin
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', adminRoles.map(r => r.user_id));

      if (profilesError) throw profilesError;

      // Combine data - we need to get emails from auth but we can only show what we have
      const adminList: AdminUser[] = adminRoles.map(role => {
        const profile = profiles?.find(p => p.user_id === role.user_id);
        return {
          user_id: role.user_id,
          email: '', // Will be populated if we can get it
          full_name: profile?.full_name || null,
          created_at: role.created_at,
        };
      });

      setAdmins(adminList);
    } catch (error) {
      console.error('Error loading admins:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load admin list.",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadAdmins();
  }, [loadAdmins]);

  const addAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newAdminEmail.trim()) {
      toast({
        variant: "destructive",
        title: "Email Required",
        description: "Please enter an email address.",
      });
      return;
    }

    setAdding(true);
    try {
      // First, find the user by checking profiles
      // Since we can't query auth.users directly, we need to find users through their profiles
      // We'll need to use an edge function or match by email in a different way
      
      // For now, we'll create an edge function approach or use a workaround
      // Let's try to find if there's an existing way to add admin by email
      
      toast({
        variant: "destructive",
        title: "Feature Limitation",
        description: "To add a new admin, please contact the system administrator to manually add the admin role in the database.",
      });
      
    } catch (error) {
      console.error('Error adding admin:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add admin.",
      });
    } finally {
      setAdding(false);
      setNewAdminEmail('');
    }
  };

  const removeAdmin = async (userId: string) => {
    // Get current user to prevent self-removal
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    
    if (currentUser?.id === userId) {
      toast({
        variant: "destructive",
        title: "Cannot Remove Self",
        description: "You cannot remove your own admin privileges.",
      });
      return;
    }

    setRemovingId(userId);
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', 'admin');

      if (error) throw error;

      toast({
        title: "Admin Removed",
        description: "Admin privileges have been revoked.",
      });

      loadAdmins();
    } catch (error) {
      console.error('Error removing admin:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to remove admin.",
      });
    } finally {
      setRemovingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Shield className="w-5 h-5 text-primary" />
          Admin Management
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add Admin Form */}
        <form onSubmit={addAdmin} className="flex gap-2">
          <Input
            type="email"
            placeholder="Enter email to add as admin..."
            value={newAdminEmail}
            onChange={(e) => setNewAdminEmail(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" disabled={adding} size="sm">
            {adding ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <UserPlus className="w-4 h-4" />
            )}
          </Button>
        </form>

        <p className="text-xs text-muted-foreground">
          Note: The user must already have an account to be added as an admin.
        </p>

        {/* Admin List */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">Current Admins</h3>
          
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : admins.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <AlertCircle className="w-10 h-10 text-muted-foreground mb-2" />
              <p className="text-muted-foreground text-sm">No admins found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {admins.map((admin) => (
                <div 
                  key={admin.user_id}
                  className="flex items-center justify-between p-3 rounded-xl bg-secondary/50 border border-border/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        {admin.full_name || 'Unknown User'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Added {formatDate(admin.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      <Shield className="w-3 h-3 mr-1" />
                      Admin
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => removeAdmin(admin.user_id)}
                      disabled={removingId === admin.user_id}
                    >
                      {removingId === admin.user_id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
