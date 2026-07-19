import {
  Compass,
  GraduationCap,
  Home,
  LayoutDashboard,
  MessagesSquare,
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
    { label: "Dashboard", to: "/instructor", icon: LayoutDashboard },
    { label: "Courses", to: "/instructor/courses", icon: GraduationCap },
    { label: "AI", to: "/ai", icon: Sparkles },
    { label: "Messages", to: "/messages", icon: MessagesSquare },
    { label: "Earnings", to: "/instructor/earnings", icon: Wallet },
  ],
};
