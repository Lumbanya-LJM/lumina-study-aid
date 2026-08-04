import { cn } from "@/lib/utils";

interface AmanoLogoProps {
  className?: string;
  showTagline?: boolean;
  light?: boolean;
}

export function AmanoLogo({ className, showTagline = false, light = false }: AmanoLogoProps) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <svg viewBox="0 0 40 40" className="h-9 w-9 shrink-0" aria-hidden="true">
        <path d="M8 34 L20 6 L32 34 H25.5 L20 19.5 L14.5 34 Z" className={light ? "fill-white" : "fill-primary"} />
        <path d="M20 6 L32 34 H25.5 L20 19.5 Z" className="fill-accent" />
      </svg>
      <div className="leading-tight">
        <span className={cn("block text-lg font-extrabold tracking-[0.25em]", light ? "text-white" : "text-primary")}>
          AMANO
        </span>
        {showTagline && (
          <span className={cn("block text-[0.6rem] font-medium tracking-wide", light ? "text-white/70" : "text-muted-foreground")}>
            Business Intelligence Solutions
          </span>
        )}
      </div>
    </div>
  );
}
