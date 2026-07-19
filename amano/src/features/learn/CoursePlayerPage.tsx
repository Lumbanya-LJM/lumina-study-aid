import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Award,
  Check,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  GraduationCap,
  Play,
  PlayCircle,
  Sparkles,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { fadeRise } from "@/design-system/motion";
import { courseById } from "@/data/sample/catalog";
import { allLessons, getCurriculum, getQuiz, PASS_MARK } from "@/data/sample/curriculum";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { courseProgress, useLearn } from "./store";

export default function CoursePlayerPage() {
  const { courseId = "", lessonId = "" } = useParams();
  const navigate = useNavigate();
  const learn = useLearn();

  const course = courseById(courseId);
  const curriculum = useMemo(() => getCurriculum(courseId), [courseId]);
  const lessons = useMemo(() => allLessons(courseId), [courseId]);
  const lesson = lessons.find((l) => l.id === lessonId) ?? lessons[0];

  const [playing, setPlaying] = useState(false);

  if (!course || !lesson) {
    return <p className="text-muted-foreground">Lesson not found.</p>;
  }

  const idx = lessons.findIndex((l) => l.id === lesson.id);
  const done = (learn.completed[courseId] ?? []).includes(lesson.id);
  const progress = courseProgress(learn, courseId);

  const goTo = (i: number) => {
    const target = lessons[i];
    if (!target) return;
    learn.openLesson(courseId, target.id);
    setPlaying(false);
    navigate(`/learning/${courseId}/lesson/${target.id}`);
  };

  const markAndNext = () => {
    if (!done) learn.toggleComplete(courseId, lesson.id);
    if (idx < lessons.length - 1) goTo(idx + 1);
    else toast.success("Module complete — take the final assessment to earn your certificate.");
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="min-w-0 space-y-5">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link to={`/courses/${course.slug}`} className="transition-colors hover:text-foreground">
            {course.title}
          </Link>
          <span>/</span>
          <span className="truncate text-foreground">{lesson.title}</span>
        </div>

        {lesson.kind === "video" ? (
          <>
            {/* Player */}
            <motion.div
              variants={fadeRise}
              initial="hidden"
              animate="visible"
              className={cn(
                "dark relative aspect-video w-full overflow-hidden rounded-lg border border-border bg-gradient-to-br",
                course.thumbnailTone
              )}
            >
              <button
                aria-label={playing ? "Pause" : "Play"}
                onClick={() => setPlaying(!playing)}
                className="absolute inset-0 grid place-items-center"
              >
                <AnimatePresence mode="wait">
                  {!playing ? (
                    <motion.span
                      key="play"
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.9, opacity: 0 }}
                      className="grid h-16 w-16 place-items-center rounded-full bg-gold-gradient text-primary-foreground shadow-glow-gold"
                    >
                      <Play className="ml-1 h-7 w-7" />
                    </motion.span>
                  ) : (
                    <motion.span
                      key="bars"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-end gap-1.5"
                    >
                      {[0, 1, 2, 3].map((i) => (
                        <motion.span
                          key={i}
                          animate={{ height: [10, 26, 12, 30, 10] }}
                          transition={{ repeat: Infinity, duration: 1.1, delay: i * 0.12 }}
                          className="w-1.5 rounded-full bg-accent"
                        />
                      ))}
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center gap-3 bg-gradient-to-t from-background/90 to-transparent p-4 text-xs text-foreground">
                <span className="tabular-nums">{playing ? "02:41" : "00:00"} / {lesson.durationMin}:00</span>
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-border">
                  <div className="h-full bg-gold-gradient" style={{ width: playing ? "34%" : "0%" }} />
                </div>
                <span>1.0×</span>
              </div>
            </motion.div>

            {/* Lesson header + actions */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h1 className="font-serif text-xl text-foreground md:text-2xl">{lesson.title}</h1>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={idx === 0} onClick={() => goTo(idx - 1)}>
                  <ChevronLeft className="h-4 w-4" /> Prev
                </Button>
                <Button variant={done ? "outline" : "gold"} size="sm" onClick={markAndNext}>
                  {done ? "Next lesson" : "Complete & continue"} <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="transcript">
              <TabsList>
                <TabsTrigger value="transcript">Transcript</TabsTrigger>
                <TabsTrigger value="notes">My notes</TabsTrigger>
                <TabsTrigger value="ai">Amano AI</TabsTrigger>
              </TabsList>
              <TabsContent value="transcript" className="card-raise mt-3 p-5">
                <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                  {lesson.transcript}
                </p>
              </TabsContent>
              <TabsContent value="notes" className="mt-3">
                <Textarea
                  placeholder="Write your notes for this lesson — they save automatically."
                  defaultValue={learn.notes[lesson.id] ?? ""}
                  onBlur={(e) => {
                    learn.saveNote(lesson.id, e.target.value);
                    if (e.target.value) toast.success("Note saved");
                  }}
                  className="min-h-36"
                />
              </TabsContent>
              <TabsContent value="ai" className="card-raise mt-3 flex items-center gap-3 p-5 text-sm text-muted-foreground">
                <Sparkles className="h-5 w-5 shrink-0 text-primary" />
                Ask Amano AI to summarise this lesson, explain it another way, or
                quiz you on it — open the gold orb, it already knows where you are.
              </TabsContent>
            </Tabs>
          </>
        ) : (
          <QuizRunner courseId={courseId} />
        )}
      </div>

      {/* Curriculum rail */}
      <aside className="card-raise h-fit lg:sticky lg:top-20">
        <div className="border-b border-border p-4">
          <p className="text-sm font-semibold text-foreground">Course content</p>
          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-border">
              <div className="h-full bg-gold-gradient" style={{ width: `${progress}%` }} />
            </div>
            <span className="tabular-nums">{progress}%</span>
          </div>
        </div>
        <ScrollArea className="max-h-[52dvh] lg:max-h-[62dvh]">
          <div className="p-2">
            {curriculum.map((section) => (
              <div key={section.id} className="mb-2">
                <p className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {section.title}
                </p>
                {section.lessons.map((l) => {
                  const isActive = l.id === lesson.id;
                  const isDone = (learn.completed[courseId] ?? []).includes(l.id);
                  return (
                    <button
                      key={l.id}
                      onClick={() => goTo(lessons.findIndex((x) => x.id === l.id))}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-sm transition-colors",
                        isActive ? "bg-surface-2 text-primary" : "text-muted-foreground hover:bg-surface-2 hover:text-foreground"
                      )}
                    >
                      {l.kind === "quiz" ? (
                        <GraduationCap className="h-4 w-4 shrink-0" />
                      ) : isDone ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                      ) : (
                        <PlayCircle className="h-4 w-4 shrink-0" />
                      )}
                      <span className="flex-1 truncate">{l.title}</span>
                      <span className="tabular-nums text-[11px]">{l.durationMin}m</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </ScrollArea>
      </aside>
    </div>
  );
}

/* ── Final assessment ────────────────────────────────────────────────── */

function QuizRunner({ courseId }: { courseId: string }) {
  const questions = useMemo(() => getQuiz(courseId), [courseId]);
  const course = courseById(courseId)!;
  const learn = useLearn();
  const navigate = useNavigate();

  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);

  const score = submitted
    ? Math.round(
        (questions.filter((q) => answers[q.id] === q.answerIndex).length /
          questions.length) *
          100
      )
    : 0;
  const passed = score >= PASS_MARK;

  const submit = () => {
    setSubmitted(true);
    const s = Math.round(
      (questions.filter((q) => answers[q.id] === q.answerIndex).length /
        questions.length) *
        100
    );
    learn.recordQuiz(courseId, s);
    if (s >= PASS_MARK) {
      learn.toggleComplete(courseId, `${courseId}-final-quiz`);
    }
  };

  if (submitted && passed) {
    const cert = learn.claimCertificate(courseId);
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } }}
        className="dark mx-auto max-w-md rounded-lg border border-primary/30 bg-surface p-8 text-center shadow-glow-gold"
      >
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-gold-gradient">
          <Award className="h-10 w-10 text-primary-foreground" />
        </div>
        <p className="mt-5 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Certificate earned · {score}%
        </p>
        <h2 className="mt-1 font-serif text-2xl text-foreground">{course.title}</h2>
        <p className="mt-3 text-sm text-muted-foreground">
          {cert.serial} — verifiable anywhere.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button variant="gold" onClick={() => navigate("/certificates")}>
            View certificate
          </Button>
          <Button variant="outline" onClick={() => navigate("/explore")}>
            Keep learning
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-serif text-2xl text-foreground">Final assessment</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pass mark {PASS_MARK}%. {questions.length} questions — take your time.
        </p>
      </header>

      {submitted && !passed && (
        <div className="rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm text-foreground">
          You scored <span className="font-semibold tabular-nums">{score}%</span>. Review
          the explanations below, revisit the lessons, and try again.
        </div>
      )}

      <ol className="space-y-5">
        {questions.map((q, qi) => {
          const chosen = answers[q.id];
          return (
            <li key={q.id} className="card-raise p-5">
              <p className="text-sm font-semibold text-foreground">
                {qi + 1}. {q.prompt}
              </p>
              <div className="mt-3 space-y-2">
                {q.options.map((opt, oi) => {
                  const isChosen = chosen === oi;
                  const showRight = submitted && oi === q.answerIndex;
                  const showWrong = submitted && isChosen && oi !== q.answerIndex;
                  return (
                    <button
                      key={oi}
                      disabled={submitted}
                      onClick={() => setAnswers((a) => ({ ...a, [q.id]: oi }))}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-md border px-3 py-2.5 text-left text-sm transition-colors",
                        showRight
                          ? "border-success/60 bg-success/10 text-foreground"
                          : showWrong
                            ? "border-destructive/60 bg-destructive/10 text-foreground"
                            : isChosen
                              ? "border-primary/50 bg-primary/10 text-foreground"
                              : "border-border text-muted-foreground hover:border-primary/25 hover:text-foreground"
                      )}
                    >
                      <span
                        className={cn(
                          "grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[10px]",
                          isChosen || showRight ? "border-primary text-primary" : "border-border"
                        )}
                      >
                        {(showRight || (isChosen && !submitted)) && <Check className="h-3 w-3" />}
                      </span>
                      {opt}
                    </button>
                  );
                })}
              </div>
              {submitted && (
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                  {q.explanation}
                </p>
              )}
            </li>
          );
        })}
      </ol>

      <div className="flex justify-end gap-3">
        {submitted && !passed && (
          <Button variant="outline" onClick={() => { setAnswers({}); setSubmitted(false); }}>
            Try again
          </Button>
        )}
        {!submitted && (
          <Button
            variant="gold"
            disabled={Object.keys(answers).length < questions.length}
            onClick={submit}
          >
            Submit answers
          </Button>
        )}
      </div>
    </div>
  );
}
