import { motion } from "framer-motion";
import { Award, Share2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { AmanoMark } from "@/design-system/AmanoLogo";
import { EmptyState } from "@/design-system/EmptyState";
import { fadeRise, staggerParent } from "@/design-system/motion";
import { courseById, personById } from "@/data/sample/catalog";
import { useAuth } from "@/features/auth/store";
import { toast } from "sonner";
import { useLearn } from "./store";

export default function CertificatesPage() {
  const certificates = useLearn((s) => s.certificates);
  const user = useAuth((s) => s.user);
  const navigate = useNavigate();

  return (
    <motion.div variants={staggerParent} initial="hidden" animate="visible" className="space-y-6">
      <motion.header variants={fadeRise}>
        <h1 className="font-serif text-2xl text-foreground md:text-3xl">Certificates</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every certificate carries a public serial — verifiable by any employer.
        </p>
      </motion.header>

      {certificates.length === 0 ? (
        <EmptyState
          icon={Award}
          title="No certificates yet"
          description="Complete a course and pass its final assessment to earn your first."
          actionLabel="Continue learning"
          onAction={() => navigate("/learning")}
        />
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {certificates.map((cert) => {
            const course = courseById(cert.courseId);
            const instructor = course && personById(course.instructorId);
            return (
              <motion.article
                key={cert.serial}
                variants={fadeRise}
                className="relative overflow-hidden rounded-lg border border-primary/30 bg-surface p-7"
              >
                <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full border border-primary/15" />
                <div className="flex items-start justify-between">
                  <AmanoMark className="h-10 w-10" />
                  <span className="rounded-full border border-border px-2.5 py-1 text-[10px] tabular-nums text-muted-foreground">
                    {cert.serial}
                  </span>
                </div>
                <p className="mt-6 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                  Certificate of completion
                </p>
                <h2 className="mt-2 font-serif text-2xl leading-snug text-foreground">
                  {course?.title}
                </h2>
                <p className="mt-4 text-sm text-muted-foreground">
                  Awarded to{" "}
                  <span className="font-serif italic text-accent">
                    {user?.displayName ?? "Amano learner"}
                  </span>
                </p>
                <div className="mt-6 flex items-end justify-between border-t border-border pt-4 text-xs text-muted-foreground">
                  <span>
                    {new Date(cert.issuedAt).toLocaleDateString("en-GB", {
                      day: "numeric", month: "long", year: "numeric",
                    })}
                    {instructor && (
                      <>
                        <br />
                        Instructor: {instructor.displayName}
                      </>
                    )}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toast.success("Share link copied — amano.africa/verify/" + cert.serial)}
                  >
                    <Share2 className="h-3.5 w-3.5" /> Share
                  </Button>
                </div>
              </motion.article>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
