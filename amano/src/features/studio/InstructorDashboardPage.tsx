import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { Link } from "react-router-dom";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { StatTile } from "@/design-system/StatTile";
import { SectionHeader } from "@/design-system/SectionHeader";
import { fadeRise, staggerParent } from "@/design-system/motion";
import { courseById, courses } from "@/data/sample/catalog";
import {
  academyName,
  instructorId,
  recentReviews,
  revenueByMonth,
  studioStats,
} from "@/data/sample/business";

export default function InstructorDashboardPage() {
  const myCourses = courses.filter((c) => c.instructorId === instructorId);

  return (
    <motion.div variants={staggerParent} initial="hidden" animate="visible" className="space-y-8">
      <motion.header variants={fadeRise}>
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">
          Instructor Studio
        </p>
        <h1 className="mt-1 font-serif text-2xl text-foreground md:text-3xl">
          {academyName}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your academy this month — revenue, learners, and what students are saying.
        </p>
      </motion.header>

      <motion.div variants={fadeRise} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile stat={{ label: "Revenue (MTD)", value: `K${studioStats.revenueMtdZmw.toLocaleString()}`, delta: studioStats.revenueDelta }} />
        <StatTile stat={{ label: "Active students", value: studioStats.students.toLocaleString(), delta: studioStats.studentsDelta }} />
        <StatTile stat={{ label: "Watch hours", value: studioStats.watchHours.toLocaleString(), delta: studioStats.watchDelta }} />
        <StatTile stat={{ label: "Average rating", value: studioStats.rating.toFixed(1) }} />
      </motion.div>

      {/* Revenue chart */}
      <motion.section variants={fadeRise} className="card-raise p-5">
        <p className="mb-4 text-sm font-semibold text-foreground">Revenue, last six months</p>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={revenueByMonth} margin={{ left: 0, right: 8, top: 4 }}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(43 74% 46%)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="hsl(43 74% 46%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "hsl(240 5% 42%)", fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} width={52} tick={{ fill: "hsl(240 5% 42%)", fontSize: 12 }} tickFormatter={(v: number) => `K${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                formatter={(v) => [`K${Number(v).toLocaleString()}`, "Revenue"]}
                contentStyle={{ background: "hsl(var(--surface))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 13 }}
              />
              <Area type="monotone" dataKey="zmw" stroke="hsl(43 74% 46%)" strokeWidth={2} fill="url(#rev)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.section>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Course performance */}
        <motion.section variants={fadeRise}>
          <SectionHeader title="Course performance" to="/instructor/courses" />
          <div className="space-y-2">
            {myCourses.map((c) => (
              <Link
                key={c.id}
                to={`/courses/${c.slug}`}
                className="card-raise flex items-center gap-4 p-4 transition-colors hover:border-primary/25"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{c.title}</p>
                  <p className="text-xs tabular-nums text-muted-foreground">
                    {c.learners.toLocaleString()} learners · ★ {c.rating.toFixed(1)} ({c.ratingCount})
                  </p>
                </div>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                  {c.priceZmw === null ? "Pro" : `K${c.priceZmw}`}
                </span>
              </Link>
            ))}
          </div>
        </motion.section>

        {/* Recent reviews */}
        <motion.section variants={fadeRise}>
          <SectionHeader title="Recent reviews" />
          <div className="space-y-2">
            {recentReviews.map((r) => (
              <article key={r.id} className="card-raise p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-foreground">{r.student}</p>
                  <span className="inline-flex items-center gap-1 text-xs text-accent">
                    <Star className="h-3.5 w-3.5 fill-current" /> {r.rating}.0
                  </span>
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{r.body}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {courseById(r.courseId)?.title} · {r.when}
                </p>
              </article>
            ))}
          </div>
        </motion.section>
      </div>
    </motion.div>
  );
}
