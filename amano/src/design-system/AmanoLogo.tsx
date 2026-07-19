import { cn } from "@/lib/utils";

/**
 * The Amano brand, from the founder's original asset (tagline removed):
 * gold emblem — monumental A, tree, open book, rising circle — and the
 * spaced gold AMANO letterforms. Always rendered as artwork, never as an
 * interface font; keyed to transparency so it sits on light and dark alike.
 */

export function AmanoMark({ className }: { className?: string }) {
  return (
    <img
      src="/brand/amano-emblem.png"
      alt="Amano"
      className={cn("h-8 w-auto select-none", className)}
      draggable={false}
    />
  );
}

/** Horizontal header lockup: emblem + AMANO wordmark. */
export function AmanoLogo({
  className,
  markClassName,
}: {
  className?: string;
  markClassName?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <AmanoMark className={markClassName} />
      <img
        src="/brand/amano-wordmark.png"
        alt="Amano"
        className="h-[15px] w-auto select-none"
        draggable={false}
      />
    </span>
  );
}

/** Vertical brand lockup (emblem above wordmark) for theatre surfaces. */
export function AmanoLockup({ className }: { className?: string }) {
  return (
    <img
      src="/brand/amano-lockup.png"
      alt="Amano"
      className={cn("w-40 select-none", className)}
      draggable={false}
    />
  );
}
