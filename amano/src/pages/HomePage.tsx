import { motion } from "framer-motion";
import { Flame, Play } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CourseCard } from "@/design-system/CourseCard";
import { PersonCell } from "@/design-system/PersonCell";
import { SectionHeader } from "@/design-system/SectionHeader";
import { VerifiedSkillBadge } from "@/design-system/VerifiedSkillBadge";
import { fadeRise, staggerParent } from "@/design-system/motion";
import {
  courseById,
  courses,
  myBadges,
  myEnrollments,
  people,
} from "@/data/sample/catalog";

/**
 * Student home feed — Phase 2 preview wired to sample data.
 * The full feed (AI recommendations, goals, calendar) lands in Phase 5.
 */
export default function HomePage() {
  const continueLearning = myEnrollments
    .map((e) => ({ enrollment: e, course: courseById(e.courseId)! }))
    .filter((x) => x.course);
  const mentors = people.filter((p) => p.roles.includes("mentor")).slice(0, 3);

  return (
    <motion.div
      variants={staggerParent}
      initial="hidden"
      animate="visible"
      className="space-y-10"
    >
      {/* Greeting */}
      <motion.header variants={fadeRise} className="flex items-end justify-between">
        <div>
          <h1 className="font-serif text-2xl text-foreground md:text-3xl">
            Mwapoleni, Misozi
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            You're 12 lessons from your Corporate Lawyer Path milestone.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-sm font-medium text-accent">
          <Flame className="h-4 w-4 text-primary" /> 9-day streak
        </span>
      </motion.header>

      {/* Continue learning */}
      <section>
        <SectionHeader title="Continue learning" to="/learning" />
        <motion.div variants={fadeRise} className="space-y-3">
          {continueLearning.map(({ enrollment, course }) => (
            <Link
              key={course.id}
              to={`/courses/${course.slug}`}
              className="group flex items-center gap-4 rounded-lg border border-border bg-surface p-3 transition-colors hover:border-primary/25"
            >
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-md bg-surface-2 text-primary transition-colors group-hover:bg-gold-gradient group-hover:text-primary-foreground">
                <Play className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">
                  {course.title}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  Next: {enrollment.lastLesson}
                </p>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-border">
                  <div
                    className="h-full rounded-full bg-gold-gradient"
                    style={{ width: `${enrollment.progressPct}%` }}
                  />
                </div>
              </div>
              <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                {enrollment.progressPct}%
              </span>
            </Link>
          ))}
        </motion.div>
      </section>

      {/* Verified skills */}
      <section>
        <SectionHeader
          title="Your verified skills"
          subtitle="Proof employers can check in seconds"
          to="/skills"
        />
        <motion.div variants={fadeRise} className="flex flex-wrap items-center gap-2">
          {myBadges.map((b) => (
            <VerifiedSkillBadge key={b.serial} badge={b} />
          ))}
          <Button variant="outline" size="sm" asChild>
            <Link to="/skills">Verify another skill</Link>
          </Button>
        </motion.div>
      </section>

      {/* Recommended */}
      <section>
        <SectionHeader
          title="Recommended for you"
          subtitle="Chosen for your Corporate Lawyer Path"
          to="/explore"
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.slice(0, 6).map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      </section>

      {/* Mentors */}
      <section>
        <SectionHeader
          title="Mentors for you"
          subtitle="Verified professionals, one session away"
          to="/mentors"
        />
        <motion.div
          variants={fadeRise}
          className="grid grid-cols-1 gap-2 md:grid-cols-3"
        >
          {mentors.map((m) => (
            <PersonCell key={m.id} person={m} className="card-raise" />
          ))}
        </motion.div>
      </section>
    </motion.div>
  );
}
