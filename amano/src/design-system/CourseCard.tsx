import { motion } from "framer-motion";
import { Star, Clock, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { fadeRise } from "./motion";
import { CourseArt, VerticalBadge } from "./CourseArt";
import { personById } from "@/data/sample/catalog";
import type { Course } from "@/data/types";

export function CourseCard({
  course,
  progressPct,
  className,
}: {
  course: Course;
  progressPct?: number;
  className?: string;
}) {
  const instructor = personById(course.instructorId);

  return (
    <motion.div variants={fadeRise} whileHover={{ y: -2 }} className={className}>
      <Link
        to={`/courses/${course.slug}`}
        className={cn(
          "group block overflow-hidden rounded-lg border border-border bg-surface shadow-soft",
          "transition-colors hover:border-primary/25"
        )}
      >
        <CourseArt
          courseId={course.id}
          verticalId={course.verticalId}
          className="aspect-video w-full"
        >
          <VerticalBadge
            verticalId={course.verticalId}
            className="absolute left-3 top-3"
          />
          {typeof progressPct === "number" && (
            <div className="absolute inset-x-0 bottom-0 h-0.5 bg-black/30">
              <div
                className="h-full bg-gold-gradient"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          )}
        </CourseArt>

        <div className="space-y-2 p-4">
          <h3 className="font-sans text-[15px] font-semibold leading-snug text-foreground line-clamp-2">
            {course.title}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-1">
            {instructor?.displayName}
          </p>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1 text-accent">
              <Star className="h-3.5 w-3.5 fill-current" />
              <span className="tabular-nums text-foreground">{course.rating.toFixed(1)}</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              <span className="tabular-nums">{course.learners.toLocaleString()}</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              <span className="tabular-nums">{course.durationHours}h</span>
            </span>
          </div>
          <div className="pt-1 text-sm font-semibold text-foreground">
            {course.priceZmw === null ? (
              <span className="text-accent">Included in Amano Pro</span>
            ) : (
              <span className="tabular-nums">K{course.priceZmw.toLocaleString()}</span>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
