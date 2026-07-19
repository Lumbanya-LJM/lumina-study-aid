import { BadgeCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { Person } from "@/data/types";

/** Avatar + name + headline + verification tick — used across network,
 *  mentors, instructors, and recruiter search. */
export function PersonCell({
  person,
  size = "md",
  className,
}: {
  person: Person;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const initials = person.displayName
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("");

  return (
    <Link
      to={`/@${person.handle}`}
      className={cn(
        "group flex items-center gap-3 rounded-md p-2 transition-colors hover:bg-surface-2",
        className
      )}
    >
      <Avatar className={cn(size === "sm" && "h-8 w-8", size === "md" && "h-10 w-10", size === "lg" && "h-14 w-14")}>
        {person.avatarUrl && <AvatarImage src={person.avatarUrl} alt="" />}
        <AvatarFallback className="bg-surface-2 font-serif text-accent">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="flex items-center gap-1 truncate text-sm font-semibold text-foreground">
          {person.displayName}
          {person.verified && <BadgeCheck className="h-4 w-4 shrink-0 text-primary" />}
        </p>
        <p className="truncate text-xs text-muted-foreground">{person.headline}</p>
      </div>
    </Link>
  );
}
