import { Bell, Search } from "lucide-react";
import { NavLink, Outlet, Link } from "react-router-dom";
import { AmanoLogo, AmanoMark } from "@/design-system/AmanoLogo";
import { AmanoAILauncher } from "@/design-system/AmanoAILauncher";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { navByRole } from "./nav";
import { CommandPalette, useCommandPalette } from "./CommandPalette";

/**
 * Authenticated app chrome.
 * Mobile: glass top bar + 5-tab bottom bar. Desktop: left rail + top bar.
 * Role switching arrives with the auth model in Phase 3; the shell renders
 * the student navigation until then.
 */
export function AppShell() {
  const items = navByRole.student!;
  const palette = useCommandPalette();

  return (
    <div className="min-h-dvh bg-background">
      {/* Top bar */}
      <header className="glass sticky top-0 z-30 border-b border-border">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
          <Link to="/home" className="md:hidden">
            <AmanoMark />
          </Link>
          <Link to="/home" className="hidden md:block">
            <AmanoLogo />
          </Link>

          <button
            onClick={() => palette.setOpen(true)}
            className="ml-auto flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground md:ml-6 md:w-72 md:justify-start md:gap-2 md:rounded-md md:border md:border-border md:bg-surface md:px-3 md:text-sm"
            aria-label="Search"
          >
            <Search className="h-4 w-4" />
            <span className="hidden md:inline">Search Amano…</span>
            <kbd className="ml-auto hidden rounded border border-border px-1.5 text-[10px] text-muted-foreground md:inline">
              ⌘K
            </kbd>
          </button>

          <Link
            to="/notifications"
            aria-label="Notifications"
            className="relative grid h-9 w-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground md:ml-auto"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary" />
          </Link>

          <Link to="/@misozi-tembo" aria-label="Profile">
            <Avatar className="h-8 w-8 border border-border">
              <AvatarFallback className="bg-surface-2 font-serif text-sm text-accent">
                MT
              </AvatarFallback>
            </Avatar>
          </Link>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl">
        {/* Desktop rail */}
        <nav className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-52 shrink-0 flex-col gap-1 border-r border-border py-6 pr-3 md:flex">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-surface-2 text-primary"
                    : "text-muted-foreground hover:bg-surface-2 hover:text-foreground"
                )
              }
            >
              <item.icon className="h-[18px] w-[18px]" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Content */}
        <main className="min-w-0 flex-1 px-4 pb-24 pt-6 md:px-8 md:pb-12">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom tabs */}
      <nav className="glass safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-border md:hidden">
        <div className="grid grid-cols-5">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
                )
              }
            >
              <item.icon className="h-5 w-5" strokeWidth={1.75} />
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>

      <AmanoAILauncher />
      <CommandPalette open={palette.open} onOpenChange={palette.setOpen} />
    </div>
  );
}
