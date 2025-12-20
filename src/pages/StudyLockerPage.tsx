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
  Lock,
  Sparkles
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
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

const StudyLockerPage: React.FC = () => {
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

  const categories = [
    { id: 'all' as const, label: 'All Files', icon: FolderOpen },
    { id: 'notes' as FileCategory, label: 'Notes', icon: FileText },
    { id: 'past_papers' as FileCategory, label: 'Past Papers', icon: File },
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
        description: "Please sign in to upload files to your StudyLocker.",
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

        // Reload files
        await loadFiles();

        toast({
          title: "Uploaded to StudyLocker",
          description: `${file.name} is now available for Lumina.`,
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

    // Clear uploading files after a delay
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
      // Extract file path from URL
      const urlParts = fileToDelete.file_url.split('/');
      const filePath = `${user.id}/${urlParts[urlParts.length - 1]}`;

      // Delete from storage
      await supabase.storage
        .from('user-uploads')
        .remove([filePath]);

      // Delete from database
      const { error } = await supabase
        .from('user_files')
        .delete()
        .eq('id', fileToDelete.id);

      if (error) throw error;

      setFiles(prev => prev.filter(f => f.id !== fileToDelete.id));
      toast({
        title: "File Deleted",
        description: "File removed from your StudyLocker.",
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
    if (fileType.includes('pdf') || fileType.includes('document')) return FileText;
    return File;
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
        <div className="px-5 py-4 safe-top border-b border-border bg-background">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate(-1)}
              className="p-2 rounded-xl hover:bg-secondary transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <div className="flex-1">
              <h1 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Lock className="w-5 h-5 text-primary" />
                StudyLocker
              </h1>
              <p className="text-xs text-muted-foreground">Your personal study vault</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar px-5 py-4">
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search your files..."
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
                    "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                    selectedCategory === cat.id
                      ? "gradient-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  )}
                >
                  <cat.icon className="w-4 h-4" />
                  {cat.label}
                </button>
              ))}
            </div>
          </ScrollArea>

          {/* Upload Area */}
          <div className="mb-6">
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
              className="w-full border-2 border-dashed border-primary/30 rounded-2xl p-6 flex flex-col items-center gap-3 hover:bg-primary/5 transition-colors"
            >
              <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center">
                <Upload className="w-6 h-6 text-primary-foreground" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-foreground">Add to StudyLocker</p>
                <p className="text-xs text-muted-foreground">
                  Lumina can access your files for summaries, flashcards & more
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
                    className="bg-card rounded-xl p-4 border border-border/50"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FileIcon className="w-5 h-5 text-primary" />
                      </div>
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
                          <DropdownMenuItem onClick={() => window.open(file.file_url, '_blank')}>
                            <Eye className="w-4 h-4 mr-2" />
                            View
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
              <Lock className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Your StudyLocker is Empty</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Upload study materials and Lumina can help you with them
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="gradient-primary text-primary-foreground px-6 py-2 rounded-full text-sm font-medium"
              >
                Upload First File
              </button>
            </div>
          )}

          {/* Lumina Integration Info */}
          <div className="mt-6 p-4 bg-primary/5 rounded-2xl border border-primary/10">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground mb-1">Lumina-Powered</p>
                <p className="text-xs text-muted-foreground">
                  Ask Lumina to summarize your notes, create flashcards from past papers, 
                  or explain concepts from your materials. Just mention "my files" or 
                  reference specific documents in chat.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete File?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove "{fileToDelete?.file_name}" from your StudyLocker.
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
    </MobileLayout>
  );
};

export default StudyLockerPage;
