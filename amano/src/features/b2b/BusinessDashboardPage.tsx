import { useState } from "react";
import { motion } from "framer-motion";
import { Building2, Route } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { paths } from "@/data/sample/catalog";
import { corporate, employees, teams } from "@/data/sample/business";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function CompletionBar({ pct }: { pct: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-surface-2">
        <div
          className={cn(
            "h-full rounded-full",
            pct >= 80 ? "bg-success" : pct >= 60 ? "bg-gold-gradient" : "bg-warning"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs tabular-nums text-muted-foreground">{pct}%</span>
    </div>
  );
}

export default function BusinessDashboardPage() {
  const [assignOpen, setAssignOpen] = useState(false);
  const [pathId, setPathId] = useState(paths[0].id);
  const [teamId, setTeamId] = useState(teams[0].id);

  const assign = () => {
    const path = paths.find((p) => p.id === pathId);
    const team = teams.find((t) => t.id === teamId);
    setAssignOpen(false);
    toast.success(`${path?.title} assigned to ${team?.name} (${team?.members} people). Managers have been notified.`);
  };

  return (
    <motion.div variants={staggerParent} initial="hidden" animate="visible" className="space-y-8">
      <motion.header variants={fadeRise} className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-primary">
            <Building2 className="h-4 w-4" /> Amano for Business
          </p>
          <h1 className="mt-1 font-serif text-2xl text-foreground md:text-3xl">{corporate.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Learning that runs continuously — not four workshops a year.
          </p>
        </div>
        <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
          <DialogTrigger asChild>
            <Button variant="gold">
              <Route className="h-4 w-4" /> Assign learning path
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-serif">Assign a learning path</DialogTitle>
              <DialogDescription>
                Every member of the team gets the path in their home feed; managers
                see progress live.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Learning path</p>
                <Select value={pathId} onValueChange={setPathId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {paths.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Team</p>
                <Select value={teamId} onValueChange={setTeamId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {teams.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name} · {t.members} people</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAssignOpen(false)}>Cancel</Button>
              <Button variant="gold" onClick={assign}>Assign path</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.header>

      <motion.div variants={fadeRise} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile stat={{ label: "Seats active", value: `${corporate.seatsActive}/${corporate.seatsLicensed}`, delta: "+34" }} />
        <StatTile stat={{ label: "Avg completion", value: `${corporate.completionPct}%`, delta: "+5%" }} />
        <StatTile stat={{ label: "Compliance", value: `${corporate.compliancePct}%`, delta: "+2%" }} />
        <StatTile stat={{ label: "Verified skills earned", value: "214", delta: "+31" }} />
      </motion.div>

      {/* Teams */}
      <motion.section variants={fadeRise}>
        <SectionHeader title="Teams" subtitle="Completion and compliance by team — nudge where it's amber" />
        <div className="card-raise overflow-x-auto p-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Team</TableHead>
                <TableHead>Manager</TableHead>
                <TableHead className="text-right">People</TableHead>
                <TableHead>Assigned path</TableHead>
                <TableHead>Completion</TableHead>
                <TableHead>Compliance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teams.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell className="text-muted-foreground">{t.manager}</TableCell>
                  <TableCell className="text-right tabular-nums">{t.members}</TableCell>
                  <TableCell className="text-muted-foreground">{t.assignedPath}</TableCell>
                  <TableCell><CompletionBar pct={t.completionPct} /></TableCell>
                  <TableCell><CompletionBar pct={t.compliancePct} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </motion.section>

      {/* People */}
      <motion.section variants={fadeRise}>
        <SectionHeader title="People" subtitle="A live view of who is learning what" />
        <div className="card-raise overflow-x-auto p-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Team</TableHead>
                <TableHead className="text-right">Courses done</TableHead>
                <TableHead>Currently learning</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead className="text-right">Verified skills</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">{e.name}</TableCell>
                  <TableCell className="text-muted-foreground">{e.team}</TableCell>
                  <TableCell className="text-right tabular-nums">{e.coursesDone}</TableCell>
                  <TableCell className="text-muted-foreground">{e.inProgress}</TableCell>
                  <TableCell><CompletionBar pct={e.progressPct} /></TableCell>
                  <TableCell className="text-right tabular-nums">{e.verifiedSkills}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </motion.section>
    </motion.div>
  );
}
