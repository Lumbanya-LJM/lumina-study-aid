import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { useSchoolContext } from '@/contexts/SchoolContext';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MootCaseLibrary } from '@/components/moot/MootCaseLibrary';
import { MootResources } from '@/components/moot/MootResources';
import {
  Gavel,
  MessageCircle,
  BookOpen,
  Mic,
  Scale,
  FileText,
  Users,
  Clock,
  ChevronRight,
  Sparkles,
  Settings2,
} from 'lucide-react';

const modules = [
  {
    id: 'foundations',
    title: 'Foundations of Mooting',
    description: 'What a moot court is, the roles (appellant vs respondent), and courtroom etiquette.',
    icon: Scale,
    duration: '30 min',
    level: 'Beginner',
  },
  {
    id: 'research',
    title: 'Legal Research & Authorities',
    description: 'Finding and citing Zambian cases and statutes using the Library and ZambiaLII.',
    icon: BookOpen,
    duration: '45 min',
    level: 'Beginner',
  },
  {
    id: 'memorials',
    title: 'Writing Memorials',
    description: 'Structure a winning memorial: issues, arguments, authorities, and prayer.',
    icon: FileText,
    duration: '60 min',
    level: 'Intermediate',
  },
  {
    id: 'oral',
    title: 'Oral Advocacy',
    description: 'Delivery, handling judicial questions, and structuring submissions under pressure.',
    icon: Mic,
    duration: '45 min',
    level: 'Intermediate',
  },
  {
    id: 'mock',
    title: 'Full Mock Round',
    description: 'Run a complete timed moot round with a partner or against Lumina as opposing counsel.',
    icon: Users,
    duration: '90 min',
    level: 'Advanced',
  },
];

const practicePrompts = [
  {
    title: 'Practice opening submissions',
    prompt:
      'Act as a moot court judge. I will deliver my opening submissions for the appellant. Interrupt me with judicial questions and afterwards give me detailed feedback on structure, clarity, and use of authority.',
  },
  {
    title: 'Draft a moot problem',
    prompt:
      'Create a moot court problem suitable for a Zambian law student, involving a constitutional or contract law issue. Include the facts, two grounds of appeal, and the key authorities I should research.',
  },
  {
    title: 'Rebuttal practice',
    prompt:
      'Act as opposing counsel in a moot. Present an argument on a contract law issue, then let me deliver a rebuttal. Score my rebuttal and suggest improvements.',
  },
  {
    title: 'Memorial review',
    prompt:
      'Help me structure a moot court memorial. Walk me through the standard sections (cover page, table of authorities, statement of facts, issues, summary of arguments, arguments, prayer) and what judges look for in each.',
  },
];

const MootCourtPage: React.FC = () => {
  const navigate = useNavigate();
  const { school } = useSchoolContext();
  const { user } = useAuth();
  const { isAdmin, isTutor } = useUserRole();
  const [submissions, setSubmissions] = useState<any[]>([]);

  const loadSubmissions = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('moot_submissions')
      .select('*, moot_problems(title, area_of_law)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setSubmissions(data ?? []);
  }, [user]);

  useEffect(() => {
    loadSubmissions();
  }, [loadSubmissions]);

  const startPractice = (prompt: string) => {
    navigate(`/chat?q=${encodeURIComponent(prompt)}`);
  };

  const averageScore = submissions.length
    ? Math.round(
        submissions.reduce((sum, s) => sum + (s.score ?? 0), 0) / submissions.length
      )
    : null;

  if (school !== 'law') {
    return (
      <MobileLayout showNav={true}>
        <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center">
          <div className="p-4 rounded-2xl bg-muted mb-4">
            <Gavel className="w-8 h-8 text-muted-foreground" />
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">Moot Court Training</h1>
          <p className="text-sm text-muted-foreground max-w-sm mb-6">
            Moot court training is available for Law students. Switch to the School of Law to access
            advocacy training, memorial writing, and mock rounds.
          </p>
          <Button onClick={() => navigate('/home')}>Back to Home</Button>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout showNav={true}>
      <div className="flex flex-col min-h-screen py-6 px-1 safe-top max-w-3xl mx-auto w-full">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 rounded-2xl bg-primary/10">
            <Gavel className="w-7 h-7 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-foreground">Moot Court Training</h1>
            <p className="text-sm text-muted-foreground">
              Real Zambian rulings, mock submissions, and feedback from the bench
            </p>
          </div>
          {(isAdmin || isTutor) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/moot-court/manage')}
              className="shrink-0"
            >
              <Settings2 className="w-4 h-4 mr-1.5" /> Manage
            </Button>
          )}
        </div>

        <Tabs defaultValue="library">
          <TabsList className="grid grid-cols-4 mb-5">
            <TabsTrigger value="library">Cases</TabsTrigger>
            <TabsTrigger value="training">Training</TabsTrigger>
            <TabsTrigger value="scores">Scores</TabsTrigger>
            <TabsTrigger value="handbook">Handbook</TabsTrigger>
          </TabsList>

          {/* Case library */}
          <TabsContent value="library">
            <MootCaseLibrary onGraded={loadSubmissions} />
          </TabsContent>

          {/* Training */}
          <TabsContent value="training">
            <Card className="p-5 mb-6 bg-gradient-to-br from-primary/10 via-card to-card border-primary/20">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <div className="flex-1">
                  <h2 className="font-semibold text-foreground mb-1">Practice with Lumina</h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    Lumina can act as a moot judge or opposing counsel — asking judicial questions,
                    scoring your submissions, and helping you refine your memorials.
                  </p>
                  <div className="grid gap-2">
                    {practicePrompts.map((p) => (
                      <button
                        key={p.title}
                        onClick={() => startPractice(p.prompt)}
                        className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border/50 bg-card hover:border-primary/50 hover:bg-card/80 transition-all text-left group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <MessageCircle className="w-4 h-4 text-primary shrink-0" />
                          <span className="text-sm font-medium text-foreground truncate">
                            {p.title}
                          </span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            <h2 className="text-lg font-semibold text-foreground mb-3">Training Modules</h2>
            <div className="space-y-3 mb-8">
              {modules.map((m, i) => (
                <Card key={m.id} className="p-4 hover:border-primary/40 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="p-2.5 rounded-xl bg-primary/10 shrink-0">
                      <m.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-muted-foreground font-medium">
                          Module {i + 1}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {m.level}
                        </Badge>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" /> {m.duration}
                        </span>
                      </div>
                      <h3 className="font-semibold text-foreground mt-1">{m.title}</h3>
                      <p className="text-sm text-muted-foreground mt-0.5">{m.description}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <h2 className="text-lg font-semibold text-foreground mb-3">Resources</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <button
                onClick={() => navigate('/library')}
                className="flex items-center gap-3 p-4 rounded-xl border border-border/50 bg-card hover:border-primary/50 transition-all text-left"
              >
                <BookOpen className="w-5 h-5 text-primary shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">Case Library</p>
                  <p className="text-xs text-muted-foreground">Research Zambian authorities</p>
                </div>
              </button>
              <button
                onClick={() => navigate('/academy')}
                className="flex items-center gap-3 p-4 rounded-xl border border-border/50 bg-card hover:border-primary/50 transition-all text-left"
              >
                <Users className="w-5 h-5 text-primary shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">Live Classes</p>
                  <p className="text-xs text-muted-foreground">Advocacy sessions with tutors</p>
                </div>
              </button>
            </div>
          </TabsContent>

          {/* Scores */}
          <TabsContent value="scores">
            {submissions.length === 0 ? (
              <Card className="p-6 text-center">
                <Gavel className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  No graded submissions yet. Pick a case and submit your first argument.
                </p>
              </Card>
            ) : (
              <div className="space-y-3">
                <Card className="p-5 bg-primary/5 border-primary/20">
                  <p className="text-sm text-muted-foreground">Average score</p>
                  <p className="text-3xl font-bold text-primary">{averageScore}/100</p>
                  <Progress value={averageScore ?? 0} className="mt-3" />
                  <p className="text-xs text-muted-foreground mt-2">
                    Across {submissions.length} graded submission
                    {submissions.length === 1 ? '' : 's'}
                  </p>
                </Card>

                {submissions.map((s) => (
                  <Card key={s.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">
                          {s.moot_problems?.title ?? 'Moot submission'}
                        </p>
                        <div className="flex items-center gap-2 flex-wrap mt-1">
                          <Badge variant="secondary" className="text-xs capitalize">
                            {s.side}
                          </Badge>
                          <Badge variant="outline" className="text-xs capitalize">
                            {s.submission_type}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(s.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-2xl font-bold text-primary">{s.score}</p>
                        <p className="text-xs text-muted-foreground">/ {s.max_score}</p>
                      </div>
                    </div>
                    {s.feedback && (
                      <p className="text-sm text-muted-foreground mt-3 whitespace-pre-line line-clamp-6">
                        {s.feedback}
                      </p>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Handbook */}
          <TabsContent value="handbook">
            <MootResources />
          </TabsContent>
        </Tabs>
      </div>
    </MobileLayout>
  );
};

export default MootCourtPage;
