import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export function SectionHeader({
  title,
  subtitle,
  to,
  className,
}: {
  title: string;
  subtitle?: string;
  to?: string;
  className?: string;
}) {
  return (
    <div className={cn("mb-4 flex items-end justify-between gap-4", className)}>
      <div>
        <h2 className="font-serif text-xl text-foreground md:text-2xl">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {to && (
        <Link
          to={to}
          className="inline-flex shrink-0 items-center gap-0.5 text-sm font-medium text-accent transition-colors hover:text-primary"
        >
          See all <ChevronRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}
