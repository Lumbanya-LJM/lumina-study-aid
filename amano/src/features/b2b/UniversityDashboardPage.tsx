import { motion } from "framer-motion";
import { GraduationCap, Landmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatTile } from "@/design-system/StatTile";
import { SectionHeader } from "@/design-system/SectionHeader";
import { fadeRise, staggerParent } from "@/design-system/motion";
import { faculties, issuedCredentials, university } from "@/data/sample/business";
import { toast } from "sonner";

export default function UniversityDashboardPage() {
  return (
    <motion.div variants={staggerParent} initial="hidden" animate="visible" className="space-y-8">
      <motion.header variants={fadeRise} className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-primary">
            <Landmark className="h-4 w-4" /> University partner
          </p>
          <h1 className="mt-1 font-serif text-2xl text-foreground md:text-3xl">
            {university.name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your faculties, reaching far beyond the campus — under your own name.
          </p>
        </div>
        <Button
          variant="gold"
          onClick={() => toast.success("Course proposal form sent to the partnerships team.")}
        >
          <GraduationCap className="h-4 w-4" /> Propose a new course
        </Button>
      </motion.header>

      <motion.div variants={fadeRise} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile stat={{ label: "Enrolled learners", value: university.learners.toLocaleString(), delta: "+9%" }} />
        <StatTile stat={{ label: "Completions", value: university.completions.toLocaleString(), delta: "+12%" }} />
        <StatTile stat={{ label: "CPD hours issued", value: university.cpdHours.toLocaleString(), delta: "+7%" }} />
        <StatTile stat={{ label: "Revenue share (YTD)", value: `K${university.revenueShareZmw.toLocaleString()}`, delta: "+18%" }} />
      </motion.div>

      {/* Faculties */}
      <motion.section variants={fadeRise}>
        <SectionHeader title="Faculties on Amano" subtitle="Microcredentials, CPD, executive and alumni education" />
        <div className="grid gap-4 sm:grid-cols-2">
          {faculties.map((f) => (
            <article key={f.id} className="card-raise p-5 transition-colors hover:border-primary/25">
              <h3 className="font-serif text-lg text-foreground">{f.name}</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">{f.dean}</p>
              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{f.kind}</span>
                <span className="tabular-nums text-foreground">
                  {f.courses} courses · {f.learners.toLocaleString()} learners
                </span>
              </div>
            </article>
          ))}
        </div>
      </motion.section>

      {/* Credential registry */}
      <motion.section variants={fadeRise}>
        <SectionHeader
          title="Credential registry"
          subtitle="Every credential is serial-numbered and publicly verifiable"
        />
        <div className="card-raise overflow-x-auto p-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Serial</TableHead>
                <TableHead>Learner</TableHead>
                <TableHead>Credential</TableHead>
                <TableHead>Faculty</TableHead>
                <TableHead className="text-right">Issued</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {issuedCredentials.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="tabular-nums text-xs text-muted-foreground">{c.serial}</TableCell>
                  <TableCell className="font-medium">{c.learner}</TableCell>
                  <TableCell>{c.credential}</TableCell>
                  <TableCell className="text-muted-foreground">{c.faculty}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{c.issued}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </motion.section>
    </motion.div>
  );
}
