import React, { useState, useEffect, useRef } from 'react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { 
  ArrowLeft, 
  Upload, 
  FileText, 
  Video, 
  File, 
  X, 
  Check, 
  Search, 
  FolderOpen,
  Trash2,
  Eye,
  MoreVertical,
  Sparkles,
  Download,
  ExternalLink,
  Image
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type FileCategory = 'notes' | 'past_papers' | 'videos' | 'other';

interface StoredFile {
  id: string;
  file_name: string;
  file_type: string | null;
  file_url: string;
  file_size: number | null;
  category: string | null;
  created_at: string;
}

interface UploadingFile {
  id: string;
  name: string;
  size: number;
  type: string;
  category: FileCategory;
  progress: number;
  status: 'uploading' | 'done' | 'error';
}

const LuminaVaultPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<FileCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<StoredFile | null>(null);
  const [previewFile, setPreviewFile] = useState<StoredFile | null>(null);

  const categories = [
    { id: 'all' as const, label: 'All', icon: FolderOpen },
    { id: 'notes' as FileCategory, label: 'Notes', icon: FileText },
    { id: 'past_papers' as FileCategory, label: 'Papers', icon: File },
    { id: 'videos' as FileCategory, label: 'Videos', icon: Video },
    { id: 'other' as FileCategory, label: 'Other', icon: File },
  ];

  useEffect(() => {
    if (user) {
      loadFiles();
    }
  }, [user]);

  const loadFiles = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from('user_files')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFiles(data || []);
    } catch (error) {
      console.error('Error loading files:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load your files.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    if (!user) {
      toast({
        variant: "destructive",
        title: "Sign in required",
        description: "Please sign in to upload files.",
      });
      return;
    }

    const selectedFiles = Array.from(e.target.files);
    const category = selectedCategory === 'all' ? 'notes' : selectedCategory;

    for (const file of selectedFiles) {
      const fileId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      
      const newFile: UploadingFile = {
        id: fileId,
        name: file.name,
        size: file.size,
        type: file.type,
        category,
        progress: 0,
        status: 'uploading',
      };

      setUploadingFiles(prev => [...prev, newFile]);

      try {
        const filePath = `${user.id}/${fileId}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('user-uploads')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('user-uploads')
          .getPublicUrl(filePath);

        const { error: dbError } = await supabase
          .from('user_files')
          .insert({
            user_id: user.id,
            file_name: file.name,
            file_type: file.type,
            file_url: publicUrl,
            file_size: file.size,
            category,
          });

        if (dbError) throw dbError;

        setUploadingFiles(prev => prev.map(f => 
          f.id === fileId ? { ...f, progress: 100, status: 'done' } : f
        ));

        await loadFiles();

        toast({
          title: "Added to LuminaVault",
          description: `${file.name} is ready for Lumina.`,
        });
      } catch (error) {
        console.error('Upload error:', error);
        setUploadingFiles(prev => prev.map(f => 
          f.id === fileId ? { ...f, status: 'error' } : f
        ));
        toast({
          variant: "destructive",
          title: "Upload Failed",
          description: `Failed to upload ${file.name}.`,
        });
      }
    }

    setTimeout(() => {
      setUploadingFiles(prev => prev.filter(f => f.status === 'uploading'));
    }, 3000);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDeleteFile = async () => {
    if (!fileToDelete || !user) return;

    try {
      const urlParts = fileToDelete.file_url.split('/');
      const fileName = urlParts[urlParts.length - 1];
      const filePath = `${user.id}/${fileName}`;

      await supabase.storage
        .from('user-uploads')
        .remove([filePath]);

      const { error } = await supabase
        .from('user_files')
        .delete()
        .eq('id', fileToDelete.id);

      if (error) throw error;

      setFiles(prev => prev.filter(f => f.id !== fileToDelete.id));
      toast({
        title: "File Deleted",
        description: "Removed from your LuminaVault.",
      });
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete file.",
      });
    } finally {
      setDeleteDialogOpen(false);
      setFileToDelete(null);
    }
  };

  const getFileIcon = (fileType: string | null) => {
    if (!fileType) return File;
    if (fileType.includes('video')) return Video;
    if (fileType.includes('image')) return Image;
    if (fileType.includes('pdf') || fileType.includes('document')) return FileText;
    return File;
  };

  const canPreview = (fileType: string | null) => {
    if (!fileType) return false;
    return fileType.includes('image') || fileType.includes('pdf') || fileType.includes('video');
  };

  const renderPreview = (file: StoredFile) => {
    if (!file.file_type) return null;

    if (file.file_type.includes('image')) {
      return (
        <div className="flex items-center justify-center h-full bg-muted/30 rounded-lg overflow-hidden">
          <img
            src={file.file_url}
            alt={file.file_name}
            className="max-w-full max-h-[60vh] object-contain"
          />
        </div>
      );
    }

    if (file.file_type.includes('pdf')) {
      return (
        <iframe
          src={file.file_url}
          className="w-full h-[60vh] rounded-lg border border-border"
          title={file.file_name}
        />
      );
    }

    if (file.file_type.includes('video')) {
      return (
        <video
          src={file.file_url}
          controls
          className="w-full max-h-[60vh] rounded-lg"
        >
          Your browser does not support video playback.
        </video>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <File className="w-16 h-16 mb-4" />
        <p>Preview not available</p>
      </div>
    );
  };

  const filteredFiles = files.filter(file => {
    const matchesCategory = selectedCategory === 'all' || file.category === selectedCategory;
    const matchesSearch = file.file_name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <MobileLayout showNav={false}>
      <div className="flex flex-col min-h-screen">
        {/* Header */}
        <div className="px-5 py-4 safe-top border-b border-border bg-gradient-to-r from-primary/5 to-primary/10">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate(-1)}
              className="p-2 rounded-xl hover:bg-secondary transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <div className="flex-1">
              <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                LuminaVault
              </h1>
              <p className="text-xs text-muted-foreground">Your AI-powered study vault</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-primary">{files.length}</p>
              <p className="text-[10px] text-muted-foreground uppercase">Files</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar px-5 py-4">
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search your vault..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Category Tabs */}
          <ScrollArea className="mb-4">
            <div className="flex gap-2 pb-2">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all",
                    selectedCategory === cat.id
                      ? "gradient-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  )}
                >
                  <cat.icon className="w-3.5 h-3.5" />
                  {cat.label}
                </button>
              ))}
            </div>
          </ScrollArea>

          {/* Upload Area */}
          <div className="mb-5">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.ppt,.pptx,.mp4,.mov,.jpg,.jpeg,.png,.txt"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-primary/40 rounded-2xl p-5 flex items-center gap-4 hover:bg-primary/5 hover:border-primary/60 transition-all group"
            >
              <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                <Upload className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold text-foreground">Add Files</p>
                <p className="text-xs text-muted-foreground">
                  PDFs, docs, videos, images
                </p>
              </div>
            </button>
          </div>

          {/* Uploading Files */}
          {uploadingFiles.length > 0 && (
            <div className="space-y-2 mb-4">
              {uploadingFiles.map((file) => (
                <div
                  key={file.id}
                  className="bg-card rounded-xl p-3 border border-border/50"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center",
                      file.status === 'done' ? "bg-success/10" : 
                      file.status === 'error' ? "bg-destructive/10" : "bg-primary/10"
                    )}>
                      {file.status === 'done' ? (
                        <Check className="w-4 h-4 text-success" />
                      ) : file.status === 'error' ? (
                        <X className="w-4 h-4 text-destructive" />
                      ) : (
                        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Files List */}
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-card rounded-xl p-4 border border-border/50 animate-pulse">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-muted" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded w-3/4" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredFiles.length > 0 ? (
            <div className="space-y-2">
              {filteredFiles.map((file) => {
                const FileIcon = getFileIcon(file.file_type);
                return (
                  <div
                    key={file.id}
                    className="bg-card rounded-xl p-4 border border-border/50 hover:border-primary/20 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => canPreview(file.file_type) ? setPreviewFile(file) : window.open(file.file_url, '_blank')}
                        className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors"
                      >
                        <FileIcon className="w-5 h-5 text-primary" />
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-foreground truncate">{file.file_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(file.file_size)} • {file.category?.replace('_', ' ') || 'Other'}
                        </p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-2 rounded-lg hover:bg-secondary transition-colors">
                            <MoreVertical className="w-4 h-4 text-muted-foreground" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {canPreview(file.file_type) && (
                            <DropdownMenuItem onClick={() => setPreviewFile(file)}>
                              <Eye className="w-4 h-4 mr-2" />
                              Preview
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => window.open(file.file_url, '_blank')}>
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Open in New Tab
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/chat?file=${file.id}`)}>
                            <Sparkles className="w-4 h-4 mr-2" />
                            Ask Lumina
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => {
                              setFileToDelete(file);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                <Sparkles className="w-10 h-10 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Your LuminaVault is Empty</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-xs mx-auto">
                Upload study materials and let Lumina help you understand them
              </p>
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="gradient-primary"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload First File
              </Button>
            </div>
          )}

          {/* Lumina Integration Info */}
          {filteredFiles.length > 0 && (
            <div className="mt-6 p-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-2xl border border-primary/20">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground mb-1">Lumina-Powered</p>
                  <p className="text-xs text-muted-foreground">
                    In chat, mention "my files" or tap "Ask Lumina" on any file to get summaries, 
                    flashcards, or explanations.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete File?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove "{fileToDelete?.file_name}" from your LuminaVault.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteFile} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* File Preview Dialog */}
      <Dialog open={!!previewFile} onOpenChange={(open) => !open && setPreviewFile(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              {previewFile && (() => {
                const Icon = getFileIcon(previewFile.file_type);
                return <Icon className="w-5 h-5 text-primary" />;
              })()}
              {previewFile?.file_name}
            </DialogTitle>
          </DialogHeader>
          {previewFile && renderPreview(previewFile)}
          <div className="flex gap-2 mt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => window.open(previewFile?.file_url, '_blank')}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Open Full
            </Button>
            <Button
              className="flex-1"
              onClick={() => {
                navigate(`/chat?file=${previewFile?.id}`);
                setPreviewFile(null);
              }}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Ask Lumina
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </MobileLayout>
  );
};

export default LuminaVaultPage;
