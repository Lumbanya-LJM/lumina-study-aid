import React, { useState, useEffect } from 'react';
import { Camera } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface SidebarUserHeaderProps {
  portalIcon: React.ReactNode;
  portalName: string;
  portalSubtitle: string;
}

export const SidebarUserHeader: React.FC<SidebarUserHeaderProps> = ({
  portalIcon,
  portalName,
  portalSubtitle,
}) => {
  const { user } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [fullName, setFullName] = useState<string>('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setFullName(data.full_name || user.user_metadata?.full_name || '');
        setAvatarUrl(data.avatar_url);
      } else {
        setFullName(user.user_metadata?.full_name || user.email?.split('@')[0] || '');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      setFullName(user.user_metadata?.full_name || user.email?.split('@')[0] || '');
    }
  };

  const getInitials = (name: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload a valid image file (JPEG, PNG, WebP, or GIF)');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be smaller than 2MB');
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Update profile with cache-busting timestamp
      const urlWithTimestamp = `${publicUrl}?t=${Date.now()}`;
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: urlWithTimestamp })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setAvatarUrl(urlWithTimestamp);
      toast.success('Profile photo updated!');
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast.error('Failed to upload photo. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-4 border-b border-border/50">
      <div className="flex items-center gap-3">
        {/* Avatar with upload */}
        <label className="relative cursor-pointer group">
          <Avatar className="w-10 h-10 ring-2 ring-primary/20">
            <AvatarImage src={avatarUrl || undefined} alt={fullName} />
            <AvatarFallback className="bg-primary/20 text-primary font-semibold text-sm">
              {getInitials(fullName)}
            </AvatarFallback>
          </Avatar>
          <div className={cn(
            "absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity",
            uploading && "opacity-100"
          )}>
            {uploading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Camera className="w-4 h-4 text-white" />
            )}
          </div>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleAvatarUpload}
            className="hidden"
            disabled={uploading}
          />
        </label>

        {/* User Info */}
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-foreground truncate text-sm">
            {fullName || 'Welcome'}
          </h2>
          <p className="text-xs text-muted-foreground truncate">
            {portalSubtitle}
          </p>
        </div>
      </div>

      {/* Portal Badge */}
      <div className="mt-3 flex items-center gap-2 px-2 py-1.5 rounded-lg bg-primary/10">
        <div className="w-6 h-6 rounded-md bg-primary/20 flex items-center justify-center shrink-0">
          {portalIcon}
        </div>
        <span className="text-xs font-medium text-primary">{portalName}</span>
      </div>
    </div>
  );
};

export default SidebarUserHeader;
