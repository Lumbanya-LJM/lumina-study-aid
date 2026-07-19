import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Briefcase,
  Check,
  GraduationCap,
  HandCoins,
  Route,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AmanoLogo } from "@/design-system/AmanoLogo";
import { cn } from "@/lib/utils";
import { paths, verticals } from "@/data/sample/catalog";
import type { Role } from "@/data/types";
import { useAuth } from "./store";

type Intent = "learn" | "teach" | "mentorship" | "hire";

const intents: {
  id: Intent;
  icon: typeof GraduationCap;
  title: string;
  blurb: string;
  roles: Role[];
}[] = [
  { id: "learn", icon: GraduationCap, title: "Learn practical skills", blurb: "Courses, paths, and verified skills", roles: ["student"] },
  { id: "teach", icon: HandCoins, title: "Teach & earn", blurb: "Build an academy from your expertise", roles: ["student", "instructor"] },
  { id: "mentorship", icon: Users, title: "Find mentorship", blurb: "Guidance from verified professionals", roles: ["student"] },
  { id: "hire", icon: Briefcase, title: "Hire verified talent", blurb: "Recruit on proof, not claims", roles: ["recruiter"] },
];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const completeOnboarding = useAuth((s) => s.completeOnboarding);
  const user = useAuth((s) => s.user);

  const [step, setStep] = useState(0);
  const [intent, setIntent] = useState<Intent | null>(null);
  const [interests, setInterests] = useState<string[]>([]);

  const suggestedPaths = useMemo(() => {
    const scored = paths.map((p) => ({
      path: p,
      score: p.courseIds.length, // simple prototype ranking
    }));
    return scored.map((s) => s.path);
  }, []);
  const [pathId, setPathId] = useState<string | undefined>();

  const firstName = user?.displayName.split(" ")[0] ?? "there";

  const finish = () => {
    const roles = intents.find((i) => i.id === intent)?.roles ?? ["student"];
    completeOnboarding({ roles, interests, pathId });
    navigate("/home");
  };

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 py-8">
      <AmanoLogo className="mb-10" />

      {/* Progress */}
      <div className="mb-8 flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              i <= step ? "bg-gold-gradient" : "bg-border"
            )}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.section
            key="intent"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex-1"
          >
            <h1 className="font-serif text-2xl text-foreground">
              Mwapoleni, {firstName}. What brings you to Amano?
            </h1>
            <div className="mt-6 space-y-3">
              {intents.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setIntent(item.id)}
                  className={cn(
                    "flex w-full items-center gap-4 rounded-lg border p-4 text-left transition-colors",
                    intent === item.id
                      ? "border-primary/50 bg-primary/10"
                      : "border-border bg-surface hover:border-primary/25"
                  )}
                >
                  <item.icon
                    className={cn(
                      "h-6 w-6",
                      intent === item.id ? "text-primary" : "text-muted-foreground"
                    )}
                    strokeWidth={1.5}
                  />
                  <span className="flex-1">
                    <span className="block text-sm font-semibold text-foreground">
                      {item.title}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {item.blurb}
                    </span>
                  </span>
                  {intent === item.id && <Check className="h-5 w-5 text-primary" />}
                </button>
              ))}
            </div>
          </motion.section>
        )}

        {step === 1 && (
          <motion.section
            key="interests"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex-1"
          >
            <h1 className="font-serif text-2xl text-foreground">
              Which areas call to you?
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Pick as many as you like — your feed starts here.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {verticals.map((v) => {
                const active = interests.includes(v.id);
                return (
                  <button
                    key={v.id}
                    onClick={() =>
                      setInterests((prev) =>
                        active ? prev.filter((x) => x !== v.id) : [...prev, v.id]
                      )
                    }
                    className={cn(
                      "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                      active
                        ? "border-primary/50 bg-primary/10 text-accent"
                        : "border-border bg-surface text-muted-foreground hover:border-primary/25 hover:text-foreground"
                    )}
                  >
                    {v.name}
                  </button>
                );
              })}
            </div>
          </motion.section>
        )}

        {step === 2 && (
          <motion.section
            key="path"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex-1"
          >
            <h1 className="font-serif text-2xl text-foreground">
              Start with a guided path?
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Curated journeys that end in real capability. Optional — skip if
              you'd rather browse.
            </p>
            <div className="mt-6 space-y-3">
              {suggestedPaths.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPathId(pathId === p.id ? undefined : p.id)}
                  className={cn(
                    "flex w-full items-center gap-4 rounded-lg border p-4 text-left transition-colors",
                    pathId === p.id
                      ? "border-primary/50 bg-primary/10"
                      : "border-border bg-surface hover:border-primary/25"
                  )}
                >
                  <Route
                    className={cn(
                      "h-6 w-6",
                      pathId === p.id ? "text-primary" : "text-muted-foreground"
                    )}
                    strokeWidth={1.5}
                  />
                  <span className="flex-1">
                    <span className="block text-sm font-semibold text-foreground">
                      {p.title}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {p.outcome} · {p.courseIds.length} courses
                    </span>
                  </span>
                  {pathId === p.id && <Check className="h-5 w-5 text-primary" />}
                </button>
              ))}
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      <footer className="mt-8 flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => (step === 0 ? navigate("/home") : setStep(step - 1))}
        >
          {step === 0 ? "Skip for now" : "Back"}
        </Button>
        <Button
          variant="gold"
          disabled={step === 0 && !intent}
          onClick={() => (step === 2 ? finish() : setStep(step + 1))}
        >
          {step === 2 ? (pathId ? "Start my path" : "Enter Amano") : "Continue"}
        </Button>
      </footer>
    </div>
  );
}
