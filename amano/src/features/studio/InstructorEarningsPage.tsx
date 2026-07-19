import { motion } from "framer-motion";
import { Smartphone } from "lucide-react";
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
import { fadeRise, staggerParent } from "@/design-system/motion";
import { earningsBySource, payouts, studioStats } from "@/data/sample/business";
import { toast } from "sonner";

export default function InstructorEarningsPage() {
  const totalSources = earningsBySource.reduce((a, s) => a + s.zmw, 0);

  return (
    <motion.div variants={staggerParent} initial="hidden" animate="visible" className="space-y-8">
      <motion.header variants={fadeRise}>
        <h1 className="font-serif text-2xl text-foreground md:text-3xl">Earnings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Revenue share is computed from the platform ledger; payouts run monthly.
        </p>
      </motion.header>

      <motion.div variants={fadeRise} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile stat={{ label: "This month", value: `K${studioStats.revenueMtdZmw.toLocaleString()}`, delta: studioStats.revenueDelta }} />
        <StatTile stat={{ label: "Next payout", value: "K38,560", delta: undefined }} />
        <StatTile stat={{ label: "Lifetime earnings", value: "K312,480" }} />
        <StatTile stat={{ label: "Revenue share", value: "80%" }} />
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {/* Sources */}
          <motion.section variants={fadeRise} className="card-raise p-5">
            <p className="mb-4 text-sm font-semibold text-foreground">This month by source</p>
            <div className="space-y-3">
              {earningsBySource.map((s) => (
                <div key={s.source}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{s.source}</span>
                    <span className="font-semibold tabular-nums text-foreground">
                      K{s.zmw.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                    <div
                      className="h-full rounded-full bg-gold-gradient"
                      style={{ width: `${(s.zmw / totalSources) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.section>

          {/* Payout history */}
          <motion.section variants={fadeRise} className="card-raise overflow-x-auto p-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Gross</TableHead>
                  <TableHead className="text-right">Platform fee</TableHead>
                  <TableHead className="text-right">Net paid</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payouts.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.period}</TableCell>
                    <TableCell className="text-right tabular-nums">K{p.grossZmw.toLocaleString()}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">−K{p.platformFeeZmw.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">K{p.netZmw.toLocaleString()}</TableCell>
                    <TableCell>
                      <span className="rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success">
                        {p.status}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </motion.section>
        </div>

        {/* Payout method */}
        <motion.aside variants={fadeRise} className="card-raise h-fit space-y-4 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Payout method
          </p>
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-md bg-warning/15 text-warning">
              <Smartphone className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">MTN Mobile Money</p>
              <p className="text-xs tabular-nums text-muted-foreground">+260 96 ··· 789</p>
            </div>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Payouts land on the 3rd of each month. Airtel Money and bank
            transfer are also supported.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => toast.info("Payout settings open in the full release.")}
          >
            Change method
          </Button>
        </motion.aside>
      </div>
    </motion.div>
  );
}
