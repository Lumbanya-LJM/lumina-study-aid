import { motion } from "framer-motion";
import { GraduationCap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CourseCard } from "@/design-system/CourseCard";
import { EmptyState } from "@/design-system/EmptyState";
import { fadeRise, staggerParent } from "@/design-system/motion";
import { courseById } from "@/data/sample/catalog";
import { courseProgress, useLearn } from "./store";

export default function LearningPage() {
  const learn = useLearn();
  const navigate = useNavigate();

  const withProgress = learn.enrolled
    .map((id) => ({ course: courseById(id)!, progress: courseProgress(learn, id) }))
    .filter((x) => x.course);

  const inProgress = withProgress.filter((x) => x.progress < 100);
  const completed = withProgress.filter((x) => x.progress >= 100);

  return (
    <motion.div variants={staggerParent} initial="hidden" animate="visible" className="space-y-6">
      <motion.header variants={fadeRise}>
        <h1 className="font-serif text-2xl text-foreground md:text-3xl">My learning</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {inProgress.length} in progress · {completed.length} completed ·{" "}
          {learn.certificates.length} certificates
        </p>
      </motion.header>

      <Tabs defaultValue="progress">
        <TabsList>
          <TabsTrigger value="progress">In progress</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>
        <TabsContent value="progress" className="mt-4">
          {inProgress.length ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {inProgress.map(({ course, progress }) => (
                <CourseCard key={course.id} course={course} progressPct={progress} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={GraduationCap}
              title="Nothing in progress"
              description="Pick a course and start building capability."
              actionLabel="Explore courses"
              onAction={() => navigate("/explore")}
            />
          )}
        </TabsContent>
        <TabsContent value="completed" className="mt-4">
          {completed.length ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {completed.map(({ course, progress }) => (
                <CourseCard key={course.id} course={course} progressPct={progress} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={GraduationCap}
              title="No completions yet"
              description="Finish a course and pass its final assessment to see it here — certificate included."
            />
          )}
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
