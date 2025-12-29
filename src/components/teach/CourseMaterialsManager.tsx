import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { FileText, Upload, Trash2, ExternalLink, File, Video, Image } from 'lucide-react';

interface CourseMaterialsManagerProps {
  courseId: string;
}

interface Material {
  id: string;
  title: string;
  file_url: string;
  content_type: string;
  subject: string;
  created_at: string;
}

const contentTypes = [
  { value: 'notes', label: 'Lecture Notes' },
  { value: 'past_paper', label: 'Past Paper' },
  { value: 'case', label: 'Case Summary' },
  { value: 'video', label: 'Video' },
  { value: 'resource', label: 'Other Resource' },
];

const CourseMaterialsManager: React.FC<CourseMaterialsManagerProps> = ({ courseId }) => {
  const { toast } = useToast();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    contentType: 'notes',
    file: null as File | null
  });

  useEffect(() => {
    if (courseId) {
      loadMaterials();
    }
  }, [courseId]);

  const loadMaterials = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('library_content')
        .select('*')
        .eq('subject', courseId)
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMaterials(data || []);
    } catch (error) {
      console.error('Error loading materials:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Max 20MB
      if (file.size > 20 * 1024 * 1024) {
        toast({
          title: 'Error',
          description: 'File size must be less than 20MB',
          variant: 'destructive'
        });
        return;
      }
      setFormData({ ...formData, file });
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!courseId) {
      toast({
        title: 'Error',
        description: 'Please select a course first',
        variant: 'destructive'
      });
      return;
    }

    if (!formData.title.trim() || !formData.file) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }

    setUploading(true);
    try {
      // Upload file to storage
      const fileExt = formData.file.name.split('.').pop();
      const fileName = `${courseId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('user-uploads')
        .upload(fileName, formData.file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('user-uploads')
        .getPublicUrl(fileName);

      // Create library content entry
      const { error: contentError } = await supabase
        .from('library_content')
        .insert({
          title: formData.title.trim(),
          subject: courseId,
          content_type: formData.contentType,
          file_url: publicUrl,
          is_published: true,
          is_premium: true
        });

      if (contentError) throw contentError;

      // Send email notification to enrolled students
      try {
        await supabase.functions.invoke('send-student-notification', {
          body: {
            type: 'new_material',
            courseId: courseId,
            data: {
              title: 'New Course Material',
              materialTitle: formData.title.trim(),
            }
          }
        });
        console.log('Email notification sent for new material');
      } catch (e) {
        console.error('Failed to send email notifications:', e);
      }

      toast({
        title: 'Success',
        description: 'Material uploaded successfully!',
      });

      setFormData({ title: '', contentType: 'notes', file: null });
      loadMaterials();
    } catch (error) {
      console.error('Error uploading material:', error);
      toast({
        title: 'Error',
        description: 'Failed to upload material',
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (material: Material) => {
    if (!confirm('Are you sure you want to delete this material?')) return;

    try {
      // Extract file path from URL to delete from storage
      // URL format: https://{project}.supabase.co/storage/v1/object/public/user-uploads/{path}
      const urlParts = material.file_url.split('/user-uploads/');
      if (urlParts.length > 1) {
        const filePath = decodeURIComponent(urlParts[1]);
        await supabase.storage.from('user-uploads').remove([filePath]);
      }

      const { error } = await supabase
        .from('library_content')
        .delete()
        .eq('id', material.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Material deleted successfully',
      });

      loadMaterials();
    } catch (error) {
      console.error('Error deleting material:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete material',
        variant: 'destructive'
      });
    }
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'video': return Video;
      case 'notes': return FileText;
      default: return File;
    }
  };

  return (
    <div className="space-y-4">
      {/* Upload Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Upload Material
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpload} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="materialTitle">Title *</Label>
              <Input
                id="materialTitle"
                placeholder="e.g., Week 1 Lecture Notes"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="materialType">Material Type</Label>
              <Select
                value={formData.contentType}
                onValueChange={(value) => setFormData({ ...formData, contentType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {contentTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="materialFile">File *</Label>
              <Input
                id="materialFile"
                type="file"
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.ppt,.pptx,.mp4,.mp3,.jpg,.png"
              />
              <p className="text-xs text-muted-foreground">
                Supported: PDF, DOC, DOCX, PPT, PPTX, MP4, MP3, JPG, PNG (max 20MB)
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={uploading || !courseId}>
              {uploading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Uploading...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  Upload Material
                </span>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Materials List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Uploaded Materials
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : materials.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No materials uploaded yet
            </p>
          ) : (
            <div className="space-y-3">
              {materials.map((material) => {
                const FileIcon = getFileIcon(material.content_type);
                return (
                  <div
                    key={material.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <FileIcon className="w-5 h-5 text-primary" />
                      <div>
                        <p className="font-medium text-sm">{material.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(material.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => window.open(material.file_url, '_blank')}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(material)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CourseMaterialsManager;
