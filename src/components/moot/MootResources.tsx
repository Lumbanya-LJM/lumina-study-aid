import React, { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { BookMarked, Download, Loader2, Trash2, Upload } from 'lucide-react';

interface MootResource {
  id: string;
  title: string;
  description: string | null;
  category: string;
  file_path: string | null;
  file_url: string;
  file_name: string;
  file_size: number | null;
  uploaded_by: string;
  created_at: string;
}

export const MootResources: React.FC = () => {
  const { user } = useAuth();
  const { isAdmin, isTutor } = useUserRole();
  const canUpload = isAdmin || isTutor;

  const [resources, setResources] = useState<MootResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('moot_resources')
      .select('*')
      .eq('is_published', true)
      .order('created_at', { ascending: false });
    setResources((data ?? []) as MootResource[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleUpload = async () => {
    if (!user || !file || !title.trim()) {
      toast({
        title: 'Add a title and a file',
        description: 'Both are needed before uploading.',
        variant: 'destructive',
      });
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please keep the handbook under 20MB.',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `${user.id}/${Date.now()}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from('moot-resources')
        .upload(path, file, { upsert: false });
      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase.from('moot_resources').insert({
        title: title.trim(),
        description: description.trim() || null,
        category: 'handbook',
        file_path: path,
        file_url: path,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        uploaded_by: user.id,
      });
      if (insertError) throw insertError;

      toast({ title: 'Handbook uploaded', description: 'Students can now download it.' });
      setTitle('');
      setDescription('');
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      load();
    } catch (e: any) {
      toast({
        title: 'Upload failed',
        description: e?.message ?? 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const openResource = async (r: MootResource) => {
    const path = r.file_path ?? r.file_url;
    const { data, error } = await supabase.storage
      .from('moot-resources')
      .createSignedUrl(path, 60 * 60);
    if (error || !data?.signedUrl) {
      toast({
        title: 'Could not open the file',
        description: 'Please try again in a moment.',
        variant: 'destructive',
      });
      return;
    }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  };

  const removeResource = async (r: MootResource) => {
    const { error } = await supabase.from('moot_resources').delete().eq('id', r.id);
    if (error) {
      toast({ title: 'Could not remove it', variant: 'destructive' });
      return;
    }
    if (r.file_path) await supabase.storage.from('moot-resources').remove([r.file_path]);
    toast({ title: 'Removed' });
    load();
  };

  return (
    <div className="space-y-4">
      {canUpload && (
        <Card className="p-5">
          <h3 className="font-semibold text-foreground mb-1 flex items-center gap-2">
            <Upload className="w-4 h-4 text-primary" /> Upload the moot court handbook
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            PDF or Word document, up to 20MB. Law students will be able to download it here.
          </p>
          <div className="space-y-3">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Handbook title, e.g. LMV Moot Court Handbook 2026"
            />
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Short description (optional)"
            />
            <Input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <Button onClick={handleUpload} disabled={uploading} className="w-full">
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading…
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" /> Upload handbook
                </>
              )}
            </Button>
          </div>
        </Card>
      )}

      {loading ? (
        <Skeleton className="h-24 w-full rounded-xl" />
      ) : resources.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          No handbook has been uploaded yet.
        </Card>
      ) : (
        resources.map((r) => (
          <Card key={r.id} className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10 shrink-0">
                <BookMarked className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-foreground">{r.title}</h3>
                  <Badge variant="secondary" className="text-xs capitalize">
                    {r.category}
                  </Badge>
                </div>
                {r.description && (
                  <p className="text-sm text-muted-foreground mt-0.5">{r.description}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {r.file_name}
                  {r.file_size ? ` • ${(r.file_size / 1024 / 1024).toFixed(1)} MB` : ''}
                </p>
                <div className="flex gap-2 mt-3">
                  <Button size="sm" variant="outline" onClick={() => openResource(r)}>
                    <Download className="w-4 h-4 mr-1.5" /> Open
                  </Button>
                  {(isAdmin || r.uploaded_by === user?.id) && (
                    <Button size="sm" variant="ghost" onClick={() => removeResource(r)}>
                      <Trash2 className="w-4 h-4 mr-1.5" /> Remove
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </Card>
        ))
      )}
    </div>
  );
};
