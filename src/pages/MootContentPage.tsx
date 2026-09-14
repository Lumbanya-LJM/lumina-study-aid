import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { MootResources } from '@/components/moot/MootResources';
import { ArrowLeft, Gavel, Loader2, Plus, Trash2 } from 'lucide-react';

const emptyForm = {
  title: '',
  area_of_law: '',
  court: '',
  citation: '',
  source_url: '',
  difficulty: 'Intermediate',
  summary: '',
  facts: '',
  issues: '',
  appellant_position: '',
  respondent_position: '',
  authorities: '',
  ruling_summary: '',
};

const MootContentPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin, isTutor, loading: roleLoading } = useUserRole();
  const canManage = isAdmin || isTutor;

  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [problems, setProblems] = useState<any[]>([]);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('moot_problems')
      .select('id, title, area_of_law, citation, difficulty, is_published')
      .order('created_at', { ascending: false });
    setProblems(data ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const set = (key: keyof typeof emptyForm, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const parseAuthorities = (raw: string) =>
    raw
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [name, citation, url, principle] = line.split('|').map((p) => (p ?? '').trim());
        return { name, citation, url, principle };
      });

  const save = async () => {
    if (!form.title.trim() || !form.facts.trim() || !form.area_of_law.trim()) {
      toast({
        title: 'Missing details',
        description: 'A title, area of law and the facts are required.',
        variant: 'destructive',
      });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('moot_problems').insert({
        title: form.title.trim(),
        area_of_law: form.area_of_law.trim(),
        court: form.court.trim() || null,
        citation: form.citation.trim() || null,
        source_url: form.source_url.trim() || null,
        difficulty: form.difficulty,
        summary: form.summary.trim() || null,
        facts: form.facts.trim(),
        issues: form.issues
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
        appellant_position: form.appellant_position.trim() || null,
        respondent_position: form.respondent_position.trim() || null,
        authorities: parseAuthorities(form.authorities),
        ruling_summary: form.ruling_summary.trim() || null,
      });
      if (error) throw error;
      toast({ title: 'Case brief published', description: 'It now appears in the case library.' });
      setForm(emptyForm);
      load();
    } catch (e: any) {
      toast({
        title: 'Could not save the case brief',
        description: e?.message ?? 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from('moot_problems').delete().eq('id', id);
    if (error) {
      toast({ title: 'Could not remove it', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Removed' });
    load();
  };

  if (!roleLoading && !canManage) {
    return (
      <MobileLayout showNav={true}>
        <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center">
          <Gavel className="w-8 h-8 text-muted-foreground mb-3" />
          <h1 className="text-xl font-bold text-foreground mb-2">Moot Court Content</h1>
          <p className="text-sm text-muted-foreground max-w-sm mb-6">
            Only tutors and administrators can add moot court case briefs and handbooks.
          </p>
          <Button onClick={() => navigate('/moot-court')}>Back to Moot Court</Button>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout showNav={true}>
      <div className="flex flex-col min-h-screen py-6 px-1 safe-top max-w-3xl mx-auto w-full">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/moot-court')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Moot Court Content</h1>
            <p className="text-sm text-muted-foreground">
              Publish case briefs, rulings and the moot court handbook
            </p>
          </div>
        </div>

        <Tabs defaultValue="briefs">
          <TabsList className="grid grid-cols-2 mb-5">
            <TabsTrigger value="briefs">Case briefs</TabsTrigger>
            <TabsTrigger value="handbook">Handbook</TabsTrigger>
          </TabsList>

          <TabsContent value="briefs" className="space-y-5">
            <Card className="p-5 space-y-3">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <Plus className="w-4 h-4 text-primary" /> New case brief
              </h2>
              <Input
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
                placeholder="Case title"
              />
              <div className="grid sm:grid-cols-2 gap-3">
                <Input
                  value={form.area_of_law}
                  onChange={(e) => set('area_of_law', e.target.value)}
                  placeholder="Area of law, e.g. Constitutional Law"
                />
                <Input
                  value={form.court}
                  onChange={(e) => set('court', e.target.value)}
                  placeholder="Court"
                />
                <Input
                  value={form.citation}
                  onChange={(e) => set('citation', e.target.value)}
                  placeholder="Citation"
                />
                <Input
                  value={form.source_url}
                  onChange={(e) => set('source_url', e.target.value)}
                  placeholder="Source link (ZambiaLII)"
                />
              </div>
              <div className="flex gap-2">
                {['Beginner', 'Intermediate', 'Advanced'].map((d) => (
                  <button
                    key={d}
                    onClick={() => set('difficulty', d)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                      form.difficulty === d
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-card text-muted-foreground border-border/60'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
              <Textarea
                value={form.summary}
                onChange={(e) => set('summary', e.target.value)}
                rows={2}
                placeholder="One-line summary of the legal question"
              />
              <Textarea
                value={form.facts}
                onChange={(e) => set('facts', e.target.value)}
                rows={5}
                placeholder="Facts of the case"
              />
              <Textarea
                value={form.issues}
                onChange={(e) => set('issues', e.target.value)}
                rows={3}
                placeholder="Issues — one per line"
              />
              <Textarea
                value={form.appellant_position}
                onChange={(e) => set('appellant_position', e.target.value)}
                rows={2}
                placeholder="Appellant's position"
              />
              <Textarea
                value={form.respondent_position}
                onChange={(e) => set('respondent_position', e.target.value)}
                rows={2}
                placeholder="Respondent's position"
              />
              <Textarea
                value={form.authorities}
                onChange={(e) => set('authorities', e.target.value)}
                rows={4}
                placeholder={'Authorities — one per line as: Case name | Citation | Link | Principle'}
              />
              <Textarea
                value={form.ruling_summary}
                onChange={(e) => set('ruling_summary', e.target.value)}
                rows={3}
                placeholder="How the court actually ruled"
              />
              <Button onClick={save} disabled={saving} className="w-full">
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Publishing…
                  </>
                ) : (
                  'Publish case brief'
                )}
              </Button>
            </Card>

            <div className="space-y-2">
              <h2 className="font-semibold text-foreground">Published briefs</h2>
              {problems.map((p) => (
                <Card key={p.id} className="p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground truncate">{p.title}</p>
                    <div className="flex items-center gap-2 flex-wrap mt-0.5">
                      <Badge variant="secondary" className="text-xs">
                        {p.area_of_law}
                      </Badge>
                      {p.citation && (
                        <span className="text-xs text-muted-foreground italic truncate">
                          {p.citation}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => remove(p.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </Card>
              ))}
              {problems.length === 0 && (
                <Card className="p-5 text-center text-sm text-muted-foreground">
                  No case briefs yet.
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="handbook">
            <MootResources />
          </TabsContent>
        </Tabs>
      </div>
    </MobileLayout>
  );
};

export default MootContentPage;
