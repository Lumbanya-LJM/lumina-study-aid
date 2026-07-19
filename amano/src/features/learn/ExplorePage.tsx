import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { SearchX } from "lucide-react";
import { Input } from "@/components/ui/input";
import { CourseCard } from "@/design-system/CourseCard";
import { EmptyState } from "@/design-system/EmptyState";
import { fadeRise, staggerParent } from "@/design-system/motion";
import { courses, verticals } from "@/data/sample/catalog";
import { cn } from "@/lib/utils";

export default function ExplorePage() {
  const [verticalId, setVerticalId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return courses.filter(
      (c) =>
        (!verticalId || c.verticalId === verticalId) &&
        (!q ||
          c.title.toLowerCase().includes(q) ||
          c.subtitle.toLowerCase().includes(q))
    );
  }, [verticalId, query]);

  return (
    <motion.div variants={staggerParent} initial="hidden" animate="visible" className="space-y-6">
      <motion.header variants={fadeRise}>
        <h1 className="font-serif text-2xl text-foreground md:text-3xl">Explore</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Practical skills from Zambia's best — every course carries the Amano AI tutor.
        </p>
      </motion.header>

      <motion.div variants={fadeRise} className="space-y-3">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search courses…"
          className="max-w-md"
        />
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          <button
            onClick={() => setVerticalId(null)}
            className={cn(
              "shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
              !verticalId
                ? "border-primary/50 bg-primary/10 text-accent"
                : "border-border text-muted-foreground hover:text-foreground"
            )}
          >
            All
          </button>
          {verticals.map((v) => (
            <button
              key={v.id}
              onClick={() => setVerticalId(verticalId === v.id ? null : v.id)}
              className={cn(
                "shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                verticalId === v.id
                  ? "border-primary/50 bg-primary/10 text-accent"
                  : "border-border text-muted-foreground hover:text-foreground"
              )}
            >
              {v.name}
            </button>
          ))}
        </div>
      </motion.div>

      {filtered.length ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <CourseCard key={c.id} course={c} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={SearchX}
          title="No courses match"
          description="Try a different search or category."
          actionLabel="Clear filters"
          onAction={() => {
            setQuery("");
            setVerticalId(null);
          }}
        />
      )}
    </motion.div>
  );
}
