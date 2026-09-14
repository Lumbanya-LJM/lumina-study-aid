import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Scale, ExternalLink, Search, PenLine, BookOpen } from 'lucide-react';
import { MootSubmissionDialog } from './MootSubmissionDialog';

export interface MootAuthority {
  name: string;
  citation?: string;
  url?: string;
  principle?: string;
}

export interface MootProblem {
  id: string;
  title: string;
  area_of_law: string;
  court: string | null;
  citation: string | null;
  source_url: string | null;
  difficulty: string;
  summary: string | null;
  facts: string;
  issues: string[];
  appellant_position: string | null;
  respondent_position: string | null;
  authorities: MootAuthority[];
  ruling_summary: string | null;
}

interface Props {
  onGraded?: () => void;
}

export const MootCaseLibrary: React.FC<Props> = ({ onGraded }) => {
  const [problems, setProblems] = useState<MootProblem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [area, setArea] = useState<string>('all');
  const [selected, setSelected] = useState<MootProblem | null>(null);
  const [submitFor, setSubmitFor] = useState<MootProblem | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from('moot_problems')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: true });

      if (!error && data) {
        setProblems(
          data.map((p: any) => ({
            ...p,
            issues: Array.isArray(p.issues) ? p.issues : [],
            authorities: Array.isArray(p.authorities) ? p.authorities : [],
          })) as MootProblem[]
        );
      }
      setLoading(false);
    };
    load();
  }, []);

  const areas = useMemo(
    () => ['all', ...Array.from(new Set(problems.map((p) => p.area_of_law)))],
    [problems]
  );

  const filtered = problems.filter((p) => {
    const matchesArea = area === 'all' || p.area_of_law === area;
    const q = query.trim().toLowerCase();
    const matchesQuery =
      !q ||
      p.title.toLowerCase().includes(q) ||
      (p.citation ?? '').toLowerCase().includes(q) ||
      (p.summary ?? '').toLowerCase().includes(q) ||
      p.authorities.some((a) => a.name.toLowerCase().includes(q));
    return matchesArea && matchesQuery;
  });

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search cases, citations or authorities"
            className="pl-9"
          />
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-3 -mx-1 px-1">
        {areas.map((a) => (
          <button
            key={a}
            onClick={() => setArea(a)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-colors ${
              area === a
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card text-muted-foreground border-border/60 hover:border-primary/50'
            }`}
          >
            {a === 'all' ? 'All areas' : a}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((p) => (
          <Card key={p.id} className="p-4 hover:border-primary/40 transition-colors">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10 shrink-0">
                <Scale className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <Badge variant="secondary" className="text-xs">
                    {p.area_of_law}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {p.difficulty}
                  </Badge>
                  {p.court && (
                    <span className="text-xs text-muted-foreground">{p.court}</span>
                  )}
                </div>
                <h3 className="font-semibold text-foreground">{p.title}</h3>
                {p.citation && (
                  <p className="text-xs text-muted-foreground italic mt-0.5">{p.citation}</p>
                )}
                {p.summary && (
                  <p className="text-sm text-muted-foreground mt-1">{p.summary}</p>
                )}
                <div className="flex gap-2 mt-3 flex-wrap">
                  <Button size="sm" variant="outline" onClick={() => setSelected(p)}>
                    <BookOpen className="w-4 h-4 mr-1.5" /> Read brief
                  </Button>
                  <Button size="sm" onClick={() => setSubmitFor(p)}>
                    <PenLine className="w-4 h-4 mr-1.5" /> Submit & get graded
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}

        {filtered.length === 0 && (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            No cases match your search yet.
          </Card>
        )}
      </div>

      {/* Case brief dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.title}</DialogTitle>
                <DialogDescription>
                  {selected.court} {selected.citation ? `• ${selected.citation}` : ''}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-5 text-sm">
                <section>
                  <h4 className="font-semibold text-foreground mb-1">Facts</h4>
                  <p className="text-muted-foreground whitespace-pre-line">{selected.facts}</p>
                </section>

                <section>
                  <h4 className="font-semibold text-foreground mb-1">Issues</h4>
                  <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                    {selected.issues.map((i, n) => (
                      <li key={n}>{i}</li>
                    ))}
                  </ol>
                </section>

                <div className="grid sm:grid-cols-2 gap-3">
                  <Card className="p-3">
                    <h4 className="font-semibold text-foreground mb-1">Appellant</h4>
                    <p className="text-muted-foreground">{selected.appellant_position}</p>
                  </Card>
                  <Card className="p-3">
                    <h4 className="font-semibold text-foreground mb-1">Respondent</h4>
                    <p className="text-muted-foreground">{selected.respondent_position}</p>
                  </Card>
                </div>

                <section>
                  <h4 className="font-semibold text-foreground mb-2">Key authorities</h4>
                  <div className="space-y-2">
                    {selected.authorities.map((a, n) => (
                      <a
                        key={n}
                        href={a.url ?? '#'}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-start gap-2 p-3 rounded-xl border border-border/60 hover:border-primary/50 transition-colors"
                      >
                        <ExternalLink className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                        <div>
                          <p className="font-medium text-foreground">{a.name}</p>
                          {a.citation && (
                            <p className="text-xs text-muted-foreground italic">{a.citation}</p>
                          )}
                          {a.principle && (
                            <p className="text-xs text-muted-foreground mt-0.5">{a.principle}</p>
                          )}
                        </div>
                      </a>
                    ))}
                  </div>
                </section>

                {selected.ruling_summary && (
                  <section>
                    <h4 className="font-semibold text-foreground mb-1">How the court ruled</h4>
                    <p className="text-muted-foreground">{selected.ruling_summary}</p>
                  </section>
                )}

                <Button
                  className="w-full"
                  onClick={() => {
                    setSubmitFor(selected);
                    setSelected(null);
                  }}
                >
                  <PenLine className="w-4 h-4 mr-2" /> Draft my submission
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <MootSubmissionDialog
        problem={submitFor}
        onClose={() => setSubmitFor(null)}
        onGraded={onGraded}
      />
    </div>
  );
};
