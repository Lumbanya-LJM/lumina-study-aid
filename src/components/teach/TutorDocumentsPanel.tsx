import React, { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FileText, Upload, Eye, Trash2, Loader2, ShieldCheck } from 'lucide-react';
import {
  DOCUMENT_CATEGORIES,
  TUTOR_DOCUMENTS_BUCKET,
  TutorDocument,
  documentLabel,
  getDocumentLink,
  parseDocuments,
  toStoragePath,
} from '@/lib/tutorDocuments';

const TutorDocumentsPanel: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [documents, setDocuments] = useState<TutorDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [docType, setDocType] = useState('national_id');
  const [customName, setCustomName] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const load = useCallback(async () => {
    if (!supabase || !user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('tutor_applications')
      .select('id, status, documents')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Load documents error:', error);
    } else if (data) {
      setApplicationId(data.id);
      setStatus(data.status);
      setDocuments(parseDocuments(data.documents));
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const persist = async (next: TutorDocument[]) => {
    if (!supabase || !applicationId) return;
    const { error } = await supabase
      .from('tutor_applications')
      .update({ documents: next as unknown as never })
      .eq('id', applicationId);
    if (error) throw error;
    setDocuments(next);
  };

  const handleUpload = async () => {
    if (!supabase || !user || !file) return;
    if (!applicationId) {
      toast({
        variant: 'destructive',
        title: 'No application found',
        description: 'Submit your tutor application first, then add documents here.',
      });
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/${docType}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from(TUTOR_DOCUMENTS_BUCKET)
        .upload(path, file);
      if (uploadError) throw uploadError;

      const next: TutorDocument[] = [
        ...documents,
        {
          type: docType,
          name: customName.trim() || documentLabel(docType),
          url: path,
          uploaded_at: new Date().toISOString(),
        },
      ];
      await persist(next);

      setFile(null);
      setCustomName('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      toast({ title: 'Document uploaded', description: 'Admins can now see it during review.' });
    } catch (e) {
      console.error(e);
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: 'Please try again with a smaller file or different format.',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleView = async (doc: TutorDocument) => {
    const link = await getDocumentLink(doc.url);
    if (link) window.open(link, '_blank', 'noopener');
    else
      toast({
        variant: 'destructive',
        title: 'Could not open document',
        description: 'The file may have been removed.',
      });
  };

  const handleDelete = async (doc: TutorDocument) => {
    if (!supabase) return;
    try {
      await supabase.storage.from(TUTOR_DOCUMENTS_BUCKET).remove([toStoragePath(doc.url)]);
      await persist(documents.filter((d) => d.url !== doc.url));
      toast({ title: 'Document removed' });
    } catch (e) {
      console.error(e);
      toast({ variant: 'destructive', title: 'Could not remove document' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Upload className="w-5 h-5 text-primary" /> Upload a document
          </CardTitle>
          <CardDescription>
            Add your identity and qualification documents. Only you and platform admins can open them.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Document type</Label>
              <Select value={docType} onValueChange={setDocType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_CATEGORIES.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Label (optional)</Label>
              <Input
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder={documentLabel(docType)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>File</Label>
            <Input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <p className="text-xs text-muted-foreground">PDF, Word or image. Max 10MB.</p>
          </div>
          <Button onClick={handleUpload} disabled={!file || uploading}>
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading…
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" /> Upload document
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShieldCheck className="w-5 h-5 text-primary" /> My documents
            {status && (
              <Badge variant="outline" className="ml-2 capitalize">
                Application {status}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            {documents.length} document{documents.length === 1 ? '' : 's'} on file
          </CardDescription>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No documents yet. Upload your ID and qualifications above.
            </p>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => (
                <div
                  key={doc.url}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-card"
                >
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{doc.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {documentLabel(doc.type)}
                      {doc.uploaded_at
                        ? ` • ${new Date(doc.uploaded_at).toLocaleDateString()}`
                        : ''}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleView(doc)}>
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    onClick={() => handleDelete(doc)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TutorDocumentsPanel;
