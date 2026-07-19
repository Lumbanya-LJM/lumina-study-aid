import { cn } from "@/lib/utils";
import type { StatDatum } from "@/data/types";

/** Dashboard KPI tile: tabular numeral, delta chip, optional sparkline. */
export function StatTile({ stat, className }: { stat: StatDatum; className?: string }) {
  const positive = stat.delta?.startsWith("+");
  return (
    <div className={cn("card-raise p-4", className)}>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {stat.label}
      </p>
      <div className="mt-1.5 flex items-baseline gap-2">
        <span className="font-sans text-2xl font-semibold tabular-nums text-foreground">
          {stat.value}
        </span>
        {stat.delta && (
          <span
            className={cn(
              "rounded-full px-1.5 py-0.5 text-xs font-medium tabular-nums",
              positive ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
            )}
          >
            {stat.delta}
          </span>
        )}
      </div>
      {stat.trend && stat.trend.length > 1 && <Sparkline data={stat.trend} />}
    </div>
  );
}

function Sparkline({ data }: { data: number[] }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const points = data
    .map((v, i) => `${(i / (data.length - 1)) * 100},${28 - ((v - min) / span) * 24}`)
    .join(" ");
  return (
    <svg viewBox="0 0 100 32" className="mt-2 h-8 w-full" preserveAspectRatio="none">
      <polyline
        points={points}
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
