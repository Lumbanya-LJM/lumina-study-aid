import { cn } from "@/lib/utils";

/** The Amano mark: golden monumental A, tree, open book, rising circle. */
export function AmanoMark({ className }: { className?: string }) {
  return (
    <img
      src="/amano-mark.svg"
      alt=""
      aria-hidden
      className={cn("h-8 w-8 select-none", className)}
      draggable={false}
    />
  );
}

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
      <span className="font-serif text-xl font-medium tracking-tight text-foreground">
        Amano
      </span>
    </span>
  );
}
