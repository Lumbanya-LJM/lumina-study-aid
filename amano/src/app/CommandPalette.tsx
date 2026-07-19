import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { GraduationCap, Route, User } from "lucide-react";
import { courses, paths, people } from "@/data/sample/catalog";

/**
 * Universal search (⌘K / Ctrl-K). Phase 2 searches the sample catalogue —
 * courses, people, paths; more indexes (jobs, products, events, communities)
 * join as their modules land.
 */
export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, onOpenChange]);

  const go = (to: string) => {
    onOpenChange(false);
    navigate(to);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search courses, people, paths…" />
      <CommandList>
        <CommandEmpty>Nothing found — yet.</CommandEmpty>
        <CommandGroup heading="Courses">
          {courses.map((c) => (
            <CommandItem key={c.id} value={`${c.title} ${c.subtitle}`} onSelect={() => go(`/courses/${c.slug}`)}>
              <GraduationCap className="mr-2 h-4 w-4 text-primary" />
              {c.title}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="People">
          {people.map((p) => (
            <CommandItem key={p.id} value={`${p.displayName} ${p.headline}`} onSelect={() => go(`/@${p.handle}`)}>
              <User className="mr-2 h-4 w-4 text-primary" />
              {p.displayName}
              <span className="ml-2 truncate text-xs text-muted-foreground">{p.headline}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Learning paths">
          {paths.map((p) => (
            <CommandItem key={p.id} value={p.title} onSelect={() => go(`/paths/${p.slug}`)}>
              <Route className="mr-2 h-4 w-4 text-primary" />
              {p.title}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

export function useCommandPalette() {
  const [open, setOpen] = useState(false);
  return { open, setOpen };
}
