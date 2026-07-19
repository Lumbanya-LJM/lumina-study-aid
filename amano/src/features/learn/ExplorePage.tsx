import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Languages, SearchX } from "lucide-react";
import { Link } from "react-router-dom";
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
                "inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                verticalId === v.id
                  ? "border-primary/50 bg-primary/10 text-accent"
                  : "border-border text-muted-foreground hover:text-foreground"
              )}
            >
              <span
                aria-hidden
                className="h-2 w-2 rounded-full"
                style={{ background: `hsl(${v.accent})` }}
              />
              {v.name}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Amano Language entry point */}
      <motion.div variants={fadeRise}>
        <Link
          to="/languages"
          className="group flex items-center gap-4 rounded-lg border border-primary/30 bg-primary/10 p-4 transition-colors hover:bg-primary/15"
        >
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-gold-gradient text-primary-foreground">
            <Languages className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-foreground">
              New · Amano Language
            </span>
            <span className="block truncate text-xs text-muted-foreground">
              Learn Africa's languages — Bemba, Swahili, Yoruba, isiZulu and more, by country
            </span>
          </span>
          <ArrowRight className="h-4 w-4 shrink-0 text-accent transition-transform group-hover:translate-x-0.5" />
        </Link>
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
