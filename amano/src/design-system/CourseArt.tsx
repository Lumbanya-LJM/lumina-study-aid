import { useId } from "react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { verticalById } from "@/data/sample/catalog";
import type { PatternFamily } from "@/data/types";

/**
 * Generative course art: a geometric, textile-inspired pattern per academy,
 * drawn in the academy's accent over a deep tinted ground. Seeded by course
 * id so siblings vary in scale. Stands in until real thumbnails exist —
 * and gives every card an ownable, African-rooted texture meanwhile.
 */

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Tile contents per family, drawn in a 40×40 unit space. */
function tile(family: PatternFamily, ink: string): ReactNode {
  const stroke = { stroke: ink, fill: "none", strokeWidth: 2 } as const;
  switch (family) {
    case "pillars": // columns of law
      return (
        <>
          <rect x="6" y="4" width="6" height="32" rx="3" fill={ink} />
          <rect x="24" y="4" width="6" height="32" rx="3" fill={ink} opacity="0.55" />
        </>
      );
    case "steps": // ascending bars
      return (
        <>
          <rect x="2" y="26" width="8" height="12" rx="2" fill={ink} opacity="0.5" />
          <rect x="15" y="16" width="8" height="22" rx="2" fill={ink} opacity="0.75" />
          <rect x="28" y="6" width="8" height="32" rx="2" fill={ink} />
        </>
      );
    case "arcs": // concentric address to the room
      return (
        <>
          <path d="M4 36 A16 16 0 0 1 36 36" {...stroke} />
          <path d="M12 36 A8 8 0 0 1 28 36" {...stroke} opacity="0.6" />
          <circle cx="20" cy="34" r="2.5" fill={ink} />
        </>
      );
    case "nodes": // lattice of connected points
      return (
        <>
          <circle cx="8" cy="8" r="3" fill={ink} />
          <circle cx="32" cy="20" r="3" fill={ink} opacity="0.6" />
          <circle cx="12" cy="32" r="3" fill={ink} opacity="0.8" />
          <path d="M8 8 L32 20 L12 32" {...stroke} strokeWidth="1.5" opacity="0.5" />
        </>
      );
    case "seeds": // sown rows
      return (
        <>
          <path d="M2 14 A8 8 0 0 1 18 14" fill={ink} opacity="0.8" />
          <path d="M22 34 A8 8 0 0 1 38 34" fill={ink} opacity="0.5" />
        </>
      );
    case "zigzag": // textile chevrons
      return (
        <>
          <path d="M0 12 L10 4 L20 12 L30 4 L40 12" {...stroke} strokeWidth="2.5" />
          <path d="M0 30 L10 22 L20 30 L30 22 L40 30" {...stroke} strokeWidth="2.5" opacity="0.55" />
        </>
      );
    case "waves": // speech contours
      return (
        <>
          <path d="M0 12 Q10 4 20 12 T40 12" {...stroke} />
          <path d="M0 26 Q10 18 20 26 T40 26" {...stroke} opacity="0.6" />
        </>
      );
    case "suns": // circles of a full life
      return (
        <>
          <circle cx="12" cy="12" r="8" {...stroke} />
          <circle cx="32" cy="30" r="5" fill={ink} opacity="0.6" />
        </>
      );
  }
}

export function CourseArt({
  courseId,
  verticalId,
  className,
  children,
}: {
  courseId: string;
  verticalId: string;
  className?: string;
  /** Overlaid content (badges, progress) — rendered above the art. */
  children?: ReactNode;
}) {
  const patternId = useId();
  const vertical = verticalById(verticalId);
  const accent = vertical?.accent ?? "43 30% 40%";
  const [h, s] = accent.split(" ");
  const family = vertical?.pattern ?? "suns";

  const seed = hashSeed(courseId);
  const size = [30, 38, 46][seed % 3]; // tile scale varies per course

  const ground = `linear-gradient(135deg, hsl(${h} ${s} 18%), hsl(240 7% 10%) 90%)`;
  const ink = `hsl(${h} 45% 62% / 0.30)`;

  return (
    <div className={cn("relative overflow-hidden", className)} style={{ background: ground }}>
      <svg className="absolute inset-0 h-full w-full" aria-hidden>
        <defs>
          <pattern
            id={patternId}
            width={size}
            height={size}
            patternUnits="userSpaceOnUse"
            viewBox="0 0 40 40"
          >
            {tile(family, ink)}
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${patternId})`} />
      </svg>
      {/* soft vignette keeps overlaid text legible */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ background: "radial-gradient(90% 90% at 20% 0%, transparent 55%, hsl(240 7% 8% / 0.55))" }}
      />
      {children}
    </div>
  );
}

/** Academy badge tinted with the vertical accent — for use over CourseArt. */
export function VerticalBadge({
  verticalId,
  className,
}: {
  verticalId: string;
  className?: string;
}) {
  const vertical = verticalById(verticalId);
  if (!vertical) return null;
  const [h, s] = vertical.accent.split(" ");
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-0.5 text-xs font-medium backdrop-blur-sm",
        className
      )}
      style={{
        color: `hsl(${h} 50% 80%)`,
        background: "hsl(240 7% 8% / 0.55)",
        border: `1px solid hsl(${h} 45% 60% / 0.4)`,
      }}
    >
      {vertical.name}
    </span>
  );
}
