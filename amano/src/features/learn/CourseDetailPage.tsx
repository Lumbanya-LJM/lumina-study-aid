import { motion } from "framer-motion";
import {
  BadgeCheck,
  Clock,
  Download,
  GraduationCap,
  PlayCircle,
  Star,
  Users,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { CourseCard } from "@/design-system/CourseCard";
import { PersonCell } from "@/design-system/PersonCell";
import { SectionHeader } from "@/design-system/SectionHeader";
import { fadeRise, staggerParent } from "@/design-system/motion";
import { courses, personById, skillById, verticalById } from "@/data/sample/catalog";
import { allLessons, getCurriculum } from "@/data/sample/curriculum";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { courseProgress, useLearn } from "./store";

export default function CourseDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const course = courses.find((c) => c.slug === slug);
  const learn = useLearn();

  if (!course) {
    return <p className="text-muted-foreground">Course not found.</p>;
  }

  const instructor = personById(course.instructorId);
  const vertical = verticalById(course.verticalId);
  const curriculum = getCurriculum(course.id);
  const lessons = allLessons(course.id);
  const enrolled = learn.enrolled.includes(course.id);
  const progress = courseProgress(learn, course.id);
  const related = courses
    .filter((c) => c.verticalId === course.verticalId && c.id !== course.id)
    .slice(0, 3);

  const start = () => {
    if (!enrolled) {
      learn.enroll(course.id);
      toast.success(`Enrolled in ${course.title}`);
    }
    const next =
      learn.lastLesson[course.id] ??
      lessons.find((l) => !(learn.completed[course.id] ?? []).includes(l.id))?.id ??
      lessons[0].id;
    navigate(`/learning/${course.id}/lesson/${next}`);
  };

  return (
    <motion.div variants={staggerParent} initial="hidden" animate="visible" className="space-y-10">
      {/* Hero */}
      <motion.section
        variants={fadeRise}
        className={cn(
          "dark relative overflow-hidden rounded-lg border border-border bg-gradient-to-br p-6 md:p-10",
          course.thumbnailTone
        )}
      >
        {vertical && (
          <span className="rounded-full border border-primary/30 bg-background/60 px-3 py-1 text-xs font-medium text-accent backdrop-blur-sm">
            {vertical.name}
          </span>
        )}
        <h1 className="mt-4 max-w-2xl font-serif text-3xl leading-tight text-foreground md:text-4xl">
          {course.title}
        </h1>
        <p className="mt-3 max-w-xl text-sm text-foreground/80 md:text-base">
          {course.subtitle}
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-4 text-sm text-foreground/80">
          <span className="inline-flex items-center gap-1.5">
            <Star className="h-4 w-4 fill-current text-accent" />
            <span className="tabular-nums">{course.rating.toFixed(1)}</span>
            <span className="text-foreground/60 tabular-nums">({course.ratingCount})</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Users className="h-4 w-4" />
            <span className="tabular-nums">{course.learners.toLocaleString()} learners</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            <span className="tabular-nums">{course.durationHours} hours · {lessons.length} lessons</span>
          </span>
          <span className="rounded-full border border-border px-2.5 py-0.5 text-xs">{course.level}</span>
        </div>

        <div className="mt-7 flex flex-wrap items-center gap-3">
          <Button variant="gold" size="lg" onClick={start}>
            <PlayCircle className="h-5 w-5" />
            {enrolled ? (progress > 0 ? "Continue learning" : "Start course") : "Enrol now"}
          </Button>
          {!enrolled && (
            <span className="text-sm font-semibold text-foreground">
              {course.priceZmw === null ? "Included in Amano Pro" : `K${course.priceZmw}`}
            </span>
          )}
          {enrolled && (
            <span className="text-sm tabular-nums text-foreground/80">{progress}% complete</span>
          )}
          <Button
            variant="ghost"
            onClick={() => toast.success("Offline pack queued — lessons will be available without data.")}
          >
            <Download className="h-4 w-4" /> Save offline
          </Button>
        </div>
        {enrolled && (
          <div className="mt-4 h-1 max-w-md overflow-hidden rounded-full bg-background/40">
            <div className="h-full bg-gold-gradient" style={{ width: `${progress}%` }} />
          </div>
        )}
      </motion.section>

      <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
        <div className="space-y-10">
          {/* Curriculum */}
          <motion.section variants={fadeRise}>
            <SectionHeader title="Curriculum" subtitle={`${curriculum.length} modules · certificate on completion`} />
            <Accordion type="multiple" defaultValue={[curriculum[0]?.id]} className="rounded-lg border border-border bg-surface px-4">
              {curriculum.map((section) => (
                <AccordionItem key={section.id} value={section.id} className="border-border">
                  <AccordionTrigger className="text-sm font-semibold text-foreground hover:no-underline">
                    {section.title}
                  </AccordionTrigger>
                  <AccordionContent>
                    <ul className="space-y-1">
                      {section.lessons.map((lesson) => {
                        const done = (learn.completed[course.id] ?? []).includes(lesson.id);
                        return (
                          <li key={lesson.id}>
                            <button
                              onClick={() => {
                                if (!enrolled) return toast.info("Enrol to open lessons.");
                                navigate(`/learning/${course.id}/lesson/${lesson.id}`);
                              }}
                              className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-surface-2"
                            >
                              {lesson.kind === "quiz" ? (
                                <GraduationCap className="h-4 w-4 shrink-0 text-primary" />
                              ) : (
                                <PlayCircle className={cn("h-4 w-4 shrink-0", done ? "text-primary" : "text-muted-foreground")} />
                              )}
                              <span className={cn("flex-1", done ? "text-muted-foreground line-through decoration-border" : "text-foreground")}>
                                {lesson.title}
                              </span>
                              <span className="tabular-nums text-xs text-muted-foreground">{lesson.durationMin}m</span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.section>

          {/* Verified skills this course leads to */}
          {course.skills.length > 0 && (
            <motion.section variants={fadeRise}>
              <SectionHeader title="Leads to Verified Skills" subtitle="Finish the course, then prove the skill" />
              <div className="flex flex-wrap gap-2">
                {course.skills.map((sid) => {
                  const skill = skillById(sid);
                  return skill ? (
                    <Link
                      key={sid}
                      to="/skills"
                      className="inline-flex items-center gap-1.5 rounded-full border border-primary/35 bg-primary/10 px-3 py-1.5 text-sm font-medium text-accent transition-colors hover:bg-primary/20"
                    >
                      <BadgeCheck className="h-4 w-4 text-primary" />
                      {skill.name}
                    </Link>
                  ) : null;
                })}
              </div>
            </motion.section>
          )}
        </div>

        {/* Sidebar */}
        <motion.aside variants={fadeRise} className="space-y-6">
          {instructor && (
            <div className="card-raise p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Your instructor
              </p>
              <PersonCell person={instructor} size="lg" className="p-0 hover:bg-transparent" />
            </div>
          )}
          <div className="card-raise p-4 text-sm text-muted-foreground">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide">Includes</p>
            <ul className="space-y-1.5">
              <li>Amano AI tutor in every lesson</li>
              <li>Offline downloads</li>
              <li>Final assessment & certificate</li>
              <li>Lifetime access on any device</li>
            </ul>
          </div>
        </motion.aside>
      </div>

      {related.length > 0 && (
        <motion.section variants={fadeRise}>
          <SectionHeader title="Related courses" to="/explore" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((c) => (
              <CourseCard key={c.id} course={c} />
            ))}
          </div>
        </motion.section>
      )}
    </motion.div>
  );
}
