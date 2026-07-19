import {
  BarChart3,
  Building2,
  Compass,
  GraduationCap,
  Home,
  Landmark,
  LayoutDashboard,
  Route,
  Sparkles,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@/data/types";

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
}

/** Bottom tabs (mobile) / rail (desktop), per active role.
 *  Five tabs maximum — the mobile-first discipline. */
export const navByRole: Partial<Record<Role, NavItem[]>> = {
  student: [
    { label: "Home", to: "/home", icon: Home },
    { label: "Explore", to: "/explore", icon: Compass },
    { label: "AI", to: "/ai", icon: Sparkles },
    { label: "Network", to: "/network", icon: Users },
    { label: "Learning", to: "/learning", icon: GraduationCap },
  ],
  instructor: [
    { label: "Studio", to: "/instructor", icon: LayoutDashboard },
    { label: "Courses", to: "/instructor/courses", icon: GraduationCap },
    { label: "AI", to: "/ai", icon: Sparkles },
    { label: "Students", to: "/instructor/students", icon: Users },
    { label: "Earnings", to: "/instructor/earnings", icon: Wallet },
  ],
  corporate: [
    { label: "Overview", to: "/business", icon: Building2 },
    { label: "Paths", to: "/business/paths", icon: Route },
    { label: "AI", to: "/ai", icon: Sparkles },
    { label: "Analytics", to: "/business/analytics", icon: BarChart3 },
    { label: "Home", to: "/home", icon: Home },
  ],
  university: [
    { label: "Overview", to: "/university", icon: Landmark },
    { label: "Faculties", to: "/university/faculties", icon: GraduationCap },
    { label: "AI", to: "/ai", icon: Sparkles },
    { label: "Analytics", to: "/university/analytics", icon: BarChart3 },
    { label: "Home", to: "/home", icon: Home },
  ],
};

/** Pick the nav set from the current location — the shell shows the
 *  surface you are in (student by default). */
export function navForPath(pathname: string): NavItem[] {
  if (pathname.startsWith("/instructor")) return navByRole.instructor!;
  if (pathname.startsWith("/business") || pathname.startsWith("/manager"))
    return navByRole.corporate!;
  if (pathname.startsWith("/university")) return navByRole.university!;
  return navByRole.student!;
}
