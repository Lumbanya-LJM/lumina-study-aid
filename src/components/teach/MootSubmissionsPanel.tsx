import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { Gavel, Loader2, Upload, FileText, Download } from 'lucide-react';
import { format } from 'date-fns';

interface SubmissionRow {
  id: string;
  user_id: string;
  problem_id: string;
  side: string;
  submission_type: string;
  content: string;
  score: number | null;
  max_score: number;
  feedback: string | null;
  status: string;
  created_at: string;
  file_path: string | null;
  file_name: string | null;
  problemTitle?: string;
  studentName?: string;
}

const MootSubmissionsPanel: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ score: string; feedback: string }>({ score: '', feedback: '' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('moot_submissions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      toast({ title: 'Could not load submissions', description: error.message, variant: 'destructive' });
      setLoading(false);
      return;
    }

    const rows = (data || []) as SubmissionRow[];
    const problemIds = [...new Set(rows.map(r => r.problem_id))];
    const userIds = [...new Set(rows.map(r => r.user_id))];

    const [{ data: problems }, { data: profiles }] = await Promise.all([
      problemIds.length
        ? supabase.from('moot_problems').select('id, title').in('id', problemIds)
        : Promise.resolve({ data: [] as { id: string; title: string }[] }),
      userIds.length
        ? supabase.from('profiles').select('user_id, full_name').in('user_id', userIds)
        : Promise.resolve({ data: [] as { user_id: string; full_name: string | null }[] }),
    ]);

    setSubmissions(
      rows.map(r => ({
        ...r,
        problemTitle: problems?.find(p => p.id === r.problem_id)?.title || 'Moot problem',
        studentName: profiles?.find(p => p.user_id === r.user_id)?.full_name || 'Student',
      })),
    );
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openGrading = (s: SubmissionRow) => {
    setOpenId(openId === s.id ? null : s.id);
    setDraft({ score: s.score != null ? String(s.score) : '', feedback: s.feedback || '' });
  };

  const saveGrade = async (s: SubmissionRow) => {
    const score = Number(draft.score);
    if (draft.score === '' || Number.isNaN(score) || score < 0 || score > s.max_score) {
      toast({ title: 'Enter a score', description: `Score must be between 0 and ${s.max_score}.`, variant: 'destructive' });
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('moot_submissions')
      .update({ score, feedback: draft.feedback, status: 'graded' })
      .eq('id', s.id);
    setSaving(false);

    if (error) {
      toast({ title: 'Could not save grade', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Grade saved', description: `${s.studentName} scored ${score}/${s.max_score}.` });
    setOpenId(null);
    load();
  };

  const openFile = async (s: SubmissionRow) => {
    if (!s.file_path) return;
    const { data, error } = await supabase.storage.from('moot-submissions').createSignedUrl(s.file_path, 600);
    if (error || !data?.signedUrl) {
      toast({ title: 'Could not open file', description: error?.message ?? 'Please try again.', variant: 'destructive' });
      return;
    }
    window.open(data.signedUrl, '_blank', 'noopener');
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Gavel className="w-5 h-5 text-primary" />
              Moot Court Submissions
            </CardTitle>
            <CardDescription>Review student arguments, adjust scores and leave feedback.</CardDescription>
          </div>
          <Button variant="outline" onClick={() => navigate('/moot-court/manage')}>
            <Upload className="w-4 h-4 mr-2" />
            Upload cases & handbook
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading submissions...
            </div>
          ) : submissions.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
              No submissions yet.
            </div>
          ) : (
            <div className="space-y-3">
              {submissions.map(s => (
                <div key={s.id} className="border rounded-lg p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium">{s.studentName}</p>
                      <p className="text-sm text-muted-foreground">{s.problemTitle}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {s.side} · {s.submission_type} · {format(new Date(s.created_at), 'PPp')}
                      </p>
                      {s.file_name && <p className="text-xs text-primary mt-1 truncate">{s.file_name}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={s.status === 'graded' ? 'default' : 'secondary'}>
                        {s.score != null ? `${s.score}/${s.max_score}` : s.status}
                      </Badge>
                      <Button size="sm" variant="outline" onClick={() => openGrading(s)}>
                        {openId === s.id ? 'Close' : 'Review'}
                      </Button>
                    </div>
                  </div>

                  {openId === s.id && (
                    <div className="mt-4 space-y-3">
                      {s.file_path && (
                        <Button variant="outline" size="sm" onClick={() => openFile(s)}>
                          <Download className="w-4 h-4 mr-2" /> Open submitted file
                        </Button>
                      )}
                      <ScrollArea className="h-48 rounded-md border p-3 bg-muted/30">
                        <p className="text-sm whitespace-pre-wrap">{s.content}</p>
                      </ScrollArea>
                      <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
                        <Input
                          type="number"
                          min={0}
                          max={s.max_score}
                          placeholder={`Score /${s.max_score}`}
                          value={draft.score}
                          onChange={e => setDraft(d => ({ ...d, score: e.target.value }))}
                        />
                        <Textarea
                          placeholder="Feedback for the student"
                          value={draft.feedback}
                          onChange={e => setDraft(d => ({ ...d, feedback: e.target.value }))}
                          rows={4}
                        />
                      </div>
                      <div className="flex justify-end">
                        <Button onClick={() => saveGrade(s)} disabled={saving}>
                          {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                          Save grade
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MootSubmissionsPanel;
