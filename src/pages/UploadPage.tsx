import React, { useState, useRef } from 'react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { ArrowLeft, Upload, FileText, Video, File, X, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type FileCategory = 'notes' | 'past_papers' | 'videos' | 'other';

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  category: FileCategory;
  progress: number;
  status: 'uploading' | 'done' | 'error';
}

const UploadPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<FileCategory>('notes');

  const categories = [
    { id: 'notes' as FileCategory, label: 'Notes', icon: FileText },
    { id: 'past_papers' as FileCategory, label: 'Past Papers', icon: File },
    { id: 'videos' as FileCategory, label: 'Videos', icon: Video },
    { id: 'other' as FileCategory, label: 'Other', icon: File },
  ];

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !user) return;

    const selectedFiles = Array.from(e.target.files);
    
    for (const file of selectedFiles) {
      const fileId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      
      const newFile: UploadedFile = {
        id: fileId,
        name: file.name,
        size: file.size,
        type: file.type,
        category: selectedCategory,
        progress: 0,
        status: 'uploading',
      };

      setFiles(prev => [...prev, newFile]);

      try {
        // Upload to storage
        const filePath = `${user.id}/${fileId}-${file.name}`;
        const { error: uploadError, data } = await supabase.storage
          .from('user-uploads')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('user-uploads')
          .getPublicUrl(filePath);

        // Save file metadata to database
        const { error: dbError } = await supabase
          .from('user_files')
          .insert({
            user_id: user.id,
            file_name: file.name,
            file_type: file.type,
            file_url: publicUrl,
            file_size: file.size,
            category: selectedCategory,
          });

        if (dbError) throw dbError;

        setFiles(prev => prev.map(f => 
          f.id === fileId ? { ...f, progress: 100, status: 'done' } : f
        ));

        toast({
          title: "File Uploaded",
          description: `${file.name} has been uploaded successfully.`,
        });
      } catch (error) {
        console.error('Upload error:', error);
        setFiles(prev => prev.map(f => 
          f.id === fileId ? { ...f, status: 'error' } : f
        ));
        toast({
          variant: "destructive",
          title: "Upload Failed",
          description: `Failed to upload ${file.name}. Please try again.`,
        });
      }
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

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
            <h1 className="text-lg font-semibold text-foreground">Upload Content</h1>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar px-5 py-6">
          {/* Category Selection */}
          <div className="mb-6">
            <label className="text-sm font-medium text-foreground mb-3 block">Select Category</label>
            <div className="grid grid-cols-2 gap-3">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={cn(
                    "flex items-center gap-3 p-4 rounded-2xl transition-all",
                    selectedCategory === cat.id
                      ? "gradient-primary text-primary-foreground shadow-glow"
                      : "bg-card border border-border/50 text-foreground hover:border-primary/30"
                  )}
                >
                  <cat.icon className="w-5 h-5" />
                  <span className="font-medium text-sm">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Upload Area */}
          <div className="mb-6">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.ppt,.pptx,.mp4,.mov,.jpg,.jpeg,.png"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-primary/30 rounded-2xl p-8 flex flex-col items-center gap-4 hover:bg-primary/5 transition-colors"
            >
              <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center">
                <Upload className="w-8 h-8 text-primary-foreground" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-foreground mb-1">Upload Study Materials</p>
                <p className="text-xs text-muted-foreground">
                  PDF, Word, PowerPoint, Videos, Images
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Max file size: 50MB
                </p>
              </div>
            </button>
          </div>

          {/* Uploaded Files */}
          {files.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-foreground mb-3">Uploaded Files</h2>
              <div className="space-y-3">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className="bg-card rounded-2xl p-4 border border-border/50"
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center",
                        file.status === 'done' ? "bg-success/10" : 
                        file.status === 'error' ? "bg-destructive/10" : "bg-primary/10"
                      )}>
                        {file.status === 'done' ? (
                          <Check className="w-5 h-5 text-success" />
                        ) : file.status === 'error' ? (
                          <X className="w-5 h-5 text-destructive" />
                        ) : (
                          <FileText className="w-5 h-5 text-primary" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-foreground truncate">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(file.size)} • {file.category.replace('_', ' ')}
                        </p>
                      </div>
                      <button
                        onClick={() => removeFile(file.id)}
                        className="p-2 rounded-lg hover:bg-secondary transition-colors"
                      >
                        <X className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </div>
                    {file.status === 'uploading' && (
                      <div className="mt-3 h-1 bg-secondary rounded-full overflow-hidden">
                        <div 
                          className="h-full gradient-primary transition-all"
                          style={{ width: `${file.progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Info */}
          <div className="mt-6 p-4 bg-primary/5 rounded-2xl border border-primary/10">
            <p className="text-xs text-muted-foreground">
              <strong className="text-foreground">Lumina can process your files!</strong> Once uploaded, 
              ask Lumina to summarise your notes, create flashcards from past papers, or extract 
              key points from your materials.
            </p>
          </div>
        </div>
      </div>
    </MobileLayout>
  );
};

export default UploadPage;