import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { Gavel, Loader2, Sparkles, ThumbsUp, TrendingUp, Upload, X } from 'lucide-react';
import type { MootProblem } from './MootCaseLibrary';
import { extractSubmissionText, MOOT_SUBMISSION_ACCEPT } from '@/lib/extractSubmissionText';
import { useAuth } from '@/hooks/useAuth';

interface Props {
  problem: MootProblem | null;
  onClose: () => void;
  onGraded?: () => void;
}

type Side = 'appellant' | 'respondent';
type Kind = 'memorial' | 'oral';

export const MootSubmissionDialog: React.FC<Props> = ({ problem, onClose, onGraded }) => {
  const [side, setSide] = useState<Side>('appellant');
  const [kind, setKind] = useState<Kind>('memorial');
  const [content, setContent] = useState('');
  const [grading, setGrading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [file, setFile] = useState<File | null>(null);
  const { user } = useAuth();

  const reset = () => {
    setContent('');
    setResult(null);
    setFile(null);
    setGrading(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const submit = async () => {
    if (!problem) return;
    if (content.trim().length < 50 && !file) {
      toast({
        title: 'Submission too short',
        description: 'Write at least a few sentences before submitting for grading.',
        variant: 'destructive',
      });
      return;
    }

    setGrading(true);
    try {
      let submissionContent = content.trim();
      let filePath: string | null = null;
      if (file) {
        if (!user) throw new Error('Please sign in again before uploading.');
        submissionContent = await extractSubmissionText(file);
        const extension = file.name.split('.').pop()?.toLowerCase() ?? 'txt';
        filePath = `${user.id}/${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await supabase.storage
          .from('moot-submissions')
          .upload(filePath, file, { contentType: file.type || undefined });
        if (uploadError) throw uploadError;
      }
      const { data, error } = await supabase.functions.invoke('grade-moot-submission', {
        body: {
          problemId: problem.id,
          side,
          submissionType: kind,
          content: submissionContent,
          filePath,
          fileName: file?.name ?? null,
          fileType: file?.type ?? null,
        },
      });
      if (error || (data as any)?.error) {
        if (filePath) await supabase.storage.from('moot-submissions').remove([filePath]);
        throw error ?? new Error((data as any).error);
      }
      setResult((data as any).submission);
      onGraded?.();
    } catch (e: any) {
      toast({
        title: 'Could not grade your submission',
        description: e?.message ?? 'Please try again in a moment.',
        variant: 'destructive',
      });
    } finally {
      setGrading(false);
    }
  };

  return (
    <Dialog open={!!problem} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        {problem && !result && (
          <>
            <DialogHeader>
              <DialogTitle>Mock submission</DialogTitle>
              <DialogDescription>{problem.title}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-foreground mb-2">I am appearing for the</p>
                <div className="flex gap-2">
                  {(['appellant', 'respondent'] as Side[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => setSide(s)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium border capitalize transition-colors ${
                        side === s
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-card text-muted-foreground border-border/60'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-foreground mb-2">Submission type</p>
                <div className="flex gap-2">
                  {([
                    ['memorial', 'Written memorial'],
                    ['oral', 'Oral submission'],
                  ] as [Kind, string][]).map(([k, label]) => (
                    <button
                      key={k}
                      onClick={() => setKind(k)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                        kind === k
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-card text-muted-foreground border-border/60'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-foreground mb-2">Your submission</p>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={12}
                  maxLength={20000}
                  placeholder="May it please the court… Set out your issues, arguments, authorities and prayer."
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {content.length} / 20,000 characters
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Or upload your memorial</p>
                {file ? (
                  <div className="flex items-center gap-2 rounded-lg border border-border/60 p-3">
                    <Upload className="w-4 h-4 text-primary shrink-0" />
                    <span className="text-sm truncate flex-1">{file.name}</span>
                    <Button variant="ghost" size="icon" onClick={() => setFile(null)} aria-label="Remove file">
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <Input
                    type="file"
                    accept={MOOT_SUBMISSION_ACCEPT}
                    onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                  />
                )}
                <p className="text-xs text-muted-foreground">PDF, DOCX, or TXT · up to 10MB</p>
              </div>

              <Button className="w-full" onClick={submit} disabled={grading}>
                {grading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> The bench is reading…
                  </>
                ) : (
                  <>
                    <Gavel className="w-4 h-4 mr-2" /> Submit for grading
                  </>
                )}
              </Button>
            </div>
          </>
        )}

        {result && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" /> Judgment on your submission
              </DialogTitle>
              <DialogDescription>{problem?.title}</DialogDescription>
            </DialogHeader>

            <div className="space-y-5">
              <Card className="p-5 text-center bg-primary/5 border-primary/20">
                <p className="text-4xl font-bold text-primary">{result.score}</p>
                <p className="text-sm text-muted-foreground">out of {result.max_score}</p>
                <Progress value={result.score} className="mt-3" />
              </Card>

              <div className="space-y-2">
                {(result.rubric ?? []).map((r: any, i: number) => (
                  <div key={i} className="p-3 rounded-xl border border-border/60">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-foreground">{r.criterion}</p>
                      <Badge variant="secondary">{r.score}/20</Badge>
                    </div>
                    {r.comment && (
                      <p className="text-xs text-muted-foreground mt-1">{r.comment}</p>
                    )}
                  </div>
                ))}
              </div>

              {(result.strengths ?? []).length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5 mb-1.5">
                    <ThumbsUp className="w-4 h-4 text-primary" /> What worked
                  </h4>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    {result.strengths.map((s: string, i: number) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}

              {(result.improvements ?? []).length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5 mb-1.5">
                    <TrendingUp className="w-4 h-4 text-primary" /> Work on this
                  </h4>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    {result.improvements.map((s: string, i: number) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}

              {result.feedback && (
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-1.5">
                    Feedback from the bench
                  </h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">
                    {result.feedback}
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={reset}>
                  Try again
                </Button>
                <Button className="flex-1" onClick={handleClose}>
                  Done
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
