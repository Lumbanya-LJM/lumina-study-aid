import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { LMVLogo } from '@/components/ui/lmv-logo';
import { useAdmin } from '@/hooks/useAdmin';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  FileText, 
  Video, 
  BookOpen, 
  AlertCircle,
  ExternalLink,
  Trash2,
  Edit,
  Save,
  X,
  Upload,
  Link as LinkIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ContentItem {
  id: string;
  title: string;
  description: string | null;
  content_type: string;
  subject: string;
  year: string | null;
  citation: string | null;
  court: string | null;
  file_url: string | null;
  external_url: string | null;
  content_text: string | null;
  is_premium: boolean;
  is_published: boolean;
  created_at: string;
}

const contentTypes = [
  { value: 'case', label: 'Case', icon: BookOpen },
  { value: 'summary', label: 'Case Summary', icon: FileText },
  { value: 'paper', label: 'Past Paper', icon: FileText },
  { value: 'video', label: 'Lecture Video', icon: Video },
  { value: 'alert', label: 'Legal Alert', icon: AlertCircle },
];

const subjects = [
  'Contract Law',
  'Tort Law',
  'Criminal Law',
  'Constitutional Law',
  'Property Law',
  'Equity & Trusts',
  'Administrative Law',
  'Family Law',
  'Company Law',
  'Land Law',
  'Jurisprudence',
  'International Law',
];

const AdminContentPage: React.FC = () => {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [content, setContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    content_type: 'case',
    subject: 'Contract Law',
    year: '',
    citation: '',
    court: '',
    external_url: '',
    content_text: '',
    is_premium: false,
    is_published: true,
  });

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      toast({
        variant: 'destructive',
        title: 'Access Denied',
        description: 'You do not have admin privileges.',
      });
      navigate('/home');
    }
  }, [isAdmin, adminLoading, navigate, toast]);

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      const { data, error } = await supabase
        .from('library_content')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContent(data || []);
    } catch (error) {
      console.error('Error fetching content:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to fetch content.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setUploading(true);
    try {
      const { error } = await supabase.from('library_content').insert({
        ...formData,
        created_by: user.id,
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Content added successfully.',
      });

      setFormData({
        title: '',
        description: '',
        content_type: 'case',
        subject: 'Contract Law',
        year: '',
        citation: '',
        court: '',
        external_url: '',
        content_text: '',
        is_premium: false,
        is_published: true,
      });
      setShowForm(false);
      fetchContent();
    } catch (error) {
      console.error('Error adding content:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to add content.',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('library_content').delete().eq('id', id);
      if (error) throw error;
      
      toast({ title: 'Deleted', description: 'Content removed successfully.' });
      fetchContent();
    } catch (error) {
      console.error('Error deleting content:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete content.',
      });
    }
  };

  const togglePublish = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('library_content')
        .update({ is_published: !currentStatus })
        .eq('id', id);
      if (error) throw error;
      fetchContent();
    } catch (error) {
      console.error('Error updating content:', error);
    }
  };

  return (
    <AdminLayout
      title="Content Manager"
      subtitle="Manage library resources"
      mobileTitle="Content Manager"
      showSidebar={false}
      showBackButton={true}
    >
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Library Content</h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className="p-2 rounded-xl bg-primary text-primary-foreground"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* Add Content Form */}
        {showForm && (
          <form onSubmit={handleSubmit} className="bg-card rounded-2xl border border-border p-5 mb-6 space-y-4">
            <h2 className="font-semibold text-foreground mb-4">Add New Content</h2>
            
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Content Type</label>
              <select
                value={formData.content_type}
                onChange={(e) => setFormData({ ...formData, content_type: e.target.value })}
                className="w-full p-3 rounded-xl bg-secondary border border-border text-foreground"
              >
                {contentTypes.map((type) => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Donoghue v Stevenson"
                required
                className="w-full p-3 rounded-xl bg-secondary border border-border text-foreground"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Subject</label>
              <select
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="w-full p-3 rounded-xl bg-secondary border border-border text-foreground"
              >
                {subjects.map((subject) => (
                  <option key={subject} value={subject}>{subject}</option>
                ))}
              </select>
            </div>

            {(formData.content_type === 'case' || formData.content_type === 'summary') && (
              <>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Citation</label>
                  <input
                    type="text"
                    value={formData.citation}
                    onChange={(e) => setFormData({ ...formData, citation: e.target.value })}
                    placeholder="e.g., [1932] AC 562"
                    className="w-full p-3 rounded-xl bg-secondary border border-border text-foreground"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Court</label>
                  <input
                    type="text"
                    value={formData.court}
                    onChange={(e) => setFormData({ ...formData, court: e.target.value })}
                    placeholder="e.g., Supreme Court of Zambia"
                    className="w-full p-3 rounded-xl bg-secondary border border-border text-foreground"
                  />
                </div>
              </>
            )}

            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Year</label>
              <input
                type="text"
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                placeholder="e.g., 2024"
                className="w-full p-3 rounded-xl bg-secondary border border-border text-foreground"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">
                <LinkIcon className="w-4 h-4 inline mr-1" />
                External URL (ZambiaLii, etc.)
              </label>
              <input
                type="url"
                value={formData.external_url}
                onChange={(e) => setFormData({ ...formData, external_url: e.target.value })}
                placeholder="https://zambialii.org/..."
                className="w-full p-3 rounded-xl bg-secondary border border-border text-foreground"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description..."
                rows={2}
                className="w-full p-3 rounded-xl bg-secondary border border-border text-foreground resize-none"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Content / Summary Text</label>
              <textarea
                value={formData.content_text}
                onChange={(e) => setFormData({ ...formData, content_text: e.target.value })}
                placeholder="Full case summary or content..."
                rows={4}
                className="w-full p-3 rounded-xl bg-secondary border border-border text-foreground resize-none"
              />
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_premium}
                  onChange={(e) => setFormData({ ...formData, is_premium: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm text-foreground">Premium Content</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_published}
                  onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm text-foreground">Published</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={uploading}
              className="w-full py-3 gradient-primary rounded-xl text-primary-foreground font-semibold disabled:opacity-50"
            >
              {uploading ? 'Adding...' : 'Add Content'}
            </button>
          </form>
        )}

        {/* ZambiaLii Quick Link */}
        <a
          href="https://zambialii.org/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 bg-primary/10 border border-primary/20 rounded-2xl p-4 mb-6"
        >
          <div className="p-2 rounded-xl bg-primary/20">
            <ExternalLink className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-foreground">ZambiaLii</p>
            <p className="text-xs text-muted-foreground">Access Zambian case law database</p>
          </div>
        </a>

        {/* Content List */}
        <div className="space-y-3">
          {content.map((item) => {
            const typeConfig = contentTypes.find(t => t.value === item.content_type);
            const Icon = typeConfig?.icon || FileText;
            
            return (
              <div
                key={item.id}
                className={cn(
                  "bg-card rounded-2xl border p-4",
                  item.is_published ? "border-border" : "border-warning/50 bg-warning/5"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-primary/10">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.subject} · {item.year || 'N/A'}</p>
                    {item.citation && (
                      <p className="text-xs text-primary mt-1">{item.citation}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      {item.is_premium && (
                        <span className="px-2 py-0.5 bg-warning/10 text-warning text-[10px] font-medium rounded-full">
                          PREMIUM
                        </span>
                      )}
                      {!item.is_published && (
                        <span className="px-2 py-0.5 bg-muted text-muted-foreground text-[10px] font-medium rounded-full">
                          DRAFT
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => togglePublish(item.id, item.is_published)}
                      className="p-2 rounded-lg hover:bg-secondary text-muted-foreground"
                    >
                      {item.is_published ? <X className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-2 rounded-lg hover:bg-destructive/10 text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {content.length === 0 && !showForm && (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-foreground font-medium">No content yet</p>
            <p className="text-sm text-muted-foreground">Add cases, papers, and more for students</p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminContentPage;
