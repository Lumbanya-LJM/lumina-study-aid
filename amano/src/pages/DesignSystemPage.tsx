import { motion } from "framer-motion";
import { BookOpen, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { CourseCard } from "@/design-system/CourseCard";
import { EmptyState } from "@/design-system/EmptyState";
import { PersonCell } from "@/design-system/PersonCell";
import { StatTile } from "@/design-system/StatTile";
import { VerifiedSkillBadge } from "@/design-system/VerifiedSkillBadge";
import { fadeRise, staggerParent } from "@/design-system/motion";
import { courses, myBadges, people } from "@/data/sample/catalog";

const swatches = [
  { name: "Porcelain", cls: "bg-background", hex: "#F8F6F1" },
  { name: "White card", cls: "bg-surface", hex: "#FFFFFF" },
  { name: "Recessed", cls: "bg-surface-2", hex: "#F1EDE4" },
  { name: "Heritage Gold", cls: "bg-primary", hex: "#CC9414" },
  { name: "Deep gold ink", cls: "bg-accent", hex: "#8F6A1E" },
  { name: "Obsidian ink", cls: "bg-foreground", hex: "#17171C" },
];

/** Internal reference: the Amano UI system on one page. Route: /design */
export default function DesignSystemPage() {
  return (
    <motion.div
      variants={staggerParent}
      initial="hidden"
      animate="visible"
      className="mx-auto max-w-4xl space-y-12"
    >
      <motion.header variants={fadeRise}>
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
          Internal · Phase 2
        </p>
        <h1 className="mt-2 font-serif text-3xl text-foreground md:text-4xl">
          The Amano design system
        </h1>
        <p className="mt-2 max-w-xl text-muted-foreground">
          Quiet confidence, dual-tone: porcelain light for the everyday
          product, deep obsidian reserved for brand theatre — heroes,
          certificates, ceremonies. Reference: docs/amano/04-design-system.md.
        </p>
      </motion.header>

      <motion.section variants={fadeRise}>
        <h2 className="mb-4 font-serif text-xl text-foreground">Colour</h2>
        <div className="grid grid-cols-3 gap-3 md:grid-cols-6">
          {swatches.map((s) => (
            <div key={s.name} className="space-y-1.5">
              <div className={`h-16 rounded-md border border-border ${s.cls}`} />
              <p className="text-xs font-medium text-foreground">{s.name}</p>
              <p className="text-[11px] tabular-nums text-muted-foreground">{s.hex}</p>
            </div>
          ))}
        </div>
      </motion.section>

      <motion.section variants={fadeRise}>
        <h2 className="mb-4 font-serif text-xl text-foreground">Type</h2>
        <div className="card-raise space-y-4 p-6">
          <p className="font-serif text-4xl text-foreground">
            Where Africa learns, shares, and grows.
          </p>
          <p className="max-w-lg text-muted-foreground">
            Fraunces carries the headline register — editorial, assured. Inter
            handles the interface: clear, quick, unremarkable in the best way.
          </p>
          <p className="text-sm tabular-nums text-muted-foreground">
            Tabular numerals for money and data: K12,480.00 · 98.2%
          </p>
        </div>
      </motion.section>

      <motion.section variants={fadeRise}>
        <h2 className="mb-4 font-serif text-xl text-foreground">Buttons & inputs</h2>
        <div className="card-raise flex flex-wrap items-center gap-3 p-6">
          <Button variant="gold">Start learning</Button>
          <Button variant="default">Primary</Button>
          <Button variant="outline">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Delete</Button>
          <Badge>Badge</Badge>
          <Input placeholder="you@amano.africa" className="max-w-56" />
        </div>
      </motion.section>

      <motion.section variants={fadeRise}>
        <h2 className="mb-4 font-serif text-xl text-foreground">Stat tiles</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatTile stat={{ label: "Revenue", value: "K48,200", delta: "+12%", trend: [4, 6, 5, 8, 9, 12, 14] }} />
          <StatTile stat={{ label: "Learners", value: "2,140", delta: "+8%", trend: [10, 12, 11, 14, 16, 18, 21] }} />
          <StatTile stat={{ label: "Completion", value: "72%", delta: "+3%" }} />
          <StatTile stat={{ label: "Rating", value: "4.8", trend: [4.5, 4.6, 4.6, 4.7, 4.8, 4.8, 4.8] }} />
        </div>
      </motion.section>

      <motion.section variants={fadeRise}>
        <h2 className="mb-4 font-serif text-xl text-foreground">Course cards</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <CourseCard course={courses[1]} />
          <CourseCard course={courses[7]} progressPct={88} />
        </div>
      </motion.section>

      <motion.section variants={fadeRise}>
        <h2 className="mb-4 font-serif text-xl text-foreground">People</h2>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {people.slice(0, 4).map((p) => (
            <PersonCell key={p.id} person={p} className="card-raise" />
          ))}
        </div>
      </motion.section>

      <motion.section variants={fadeRise}>
        <h2 className="mb-4 font-serif text-xl text-foreground">
          The verified-skill seal
        </h2>
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2">
            {myBadges.map((b) => (
              <VerifiedSkillBadge key={b.serial} badge={b} />
            ))}
          </div>
          <VerifiedSkillBadge badge={myBadges[0]} variant="ceremony" />
        </div>
      </motion.section>

      <motion.section variants={fadeRise}>
        <h2 className="mb-4 font-serif text-xl text-foreground">States</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <EmptyState
            icon={Inbox}
            title="Nothing here yet"
            description="When you enrol in a course it appears here."
            actionLabel="Explore courses"
          />
          <div className="card-raise space-y-3 p-4">
            <Skeleton className="h-32 w-full rounded-md" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      </motion.section>

      <motion.footer variants={fadeRise} className="pb-8">
        <EmptyState
          icon={BookOpen}
          title="Every module ships with this discipline"
          description="Skeleton, empty, and error states are part of the definition of done — not polish for later."
        />
      </motion.footer>
    </motion.div>
  );
}
