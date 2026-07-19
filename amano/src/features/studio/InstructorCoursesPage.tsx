import { motion } from "framer-motion";
import { FileEdit, Plus, Send, Trash2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CourseCard } from "@/design-system/CourseCard";
import { SectionHeader } from "@/design-system/SectionHeader";
import { fadeRise, staggerParent } from "@/design-system/motion";
import { courses, verticalById } from "@/data/sample/catalog";
import { instructorId } from "@/data/sample/business";
import { toast } from "sonner";
import { useStudio } from "./store";

export default function InstructorCoursesPage() {
  const navigate = useNavigate();
  const { drafts, deleteDraft, submitForReview } = useStudio();
  const published = courses.filter((c) => c.instructorId === instructorId);

  return (
    <motion.div variants={staggerParent} initial="hidden" animate="visible" className="space-y-8">
      <motion.header variants={fadeRise} className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl text-foreground md:text-3xl">Courses</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {published.length} published · {drafts.length} in the builder
          </p>
        </div>
        <Button variant="gold" onClick={() => navigate("/instructor/courses/new")}>
          <Plus className="h-4 w-4" /> New course
        </Button>
      </motion.header>

      {/* Drafts */}
      <motion.section variants={fadeRise}>
        <SectionHeader title="In the builder" subtitle="Drafts and courses awaiting review" />
        <div className="space-y-2">
          {drafts.map((d) => (
            <div key={d.id} className="card-raise flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">{d.title}</p>
                <p className="text-xs text-muted-foreground">
                  {verticalById(d.verticalId)?.name} · {d.level} ·{" "}
                  {d.modules.length} modules · updated {d.updatedAt}
                </p>
              </div>
              <span
                className={
                  d.status === "In review"
                    ? "rounded-full bg-warning/15 px-2.5 py-0.5 text-xs font-medium text-warning"
                    : "rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
                }
              >
                {d.status}
              </span>
              <div className="flex items-center gap-1.5">
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/instructor/courses/${d.id}/edit`}>
                    <FileEdit className="h-3.5 w-3.5" /> Edit
                  </Link>
                </Button>
                {d.status === "Draft" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      submitForReview(d.id);
                      toast.success("Submitted — the Amano quality team will review within 48 hours.");
                    }}
                  >
                    <Send className="h-3.5 w-3.5" /> Submit
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    deleteDraft(d.id);
                    toast.info("Draft deleted.");
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
          {drafts.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nothing in the builder — start a new course.
            </p>
          )}
        </div>
      </motion.section>

      {/* Published */}
      <motion.section variants={fadeRise}>
        <SectionHeader title="Published" subtitle="Live in the Amano catalogue" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {published.map((c) => (
            <CourseCard key={c.id} course={c} />
          ))}
        </div>
      </motion.section>
    </motion.div>
  );
}
