import {
  Building2,
  CalendarRange,
  Car,
  ClipboardList,
  LayoutDashboard,
  type LucideIcon,
  ParkingSquare,
  Settings,
  Sparkles,
  Ticket,
  Users,
} from "lucide-react";

import type { UserRole } from "@/types/domain";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Roles allowed to see this item. Omitted = everyone. */
  roles?: UserRole[];
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

const MANAGER: UserRole[] = ["platform_admin", "org_admin", "property_manager"];

export const navSections: NavSection[] = [
  {
    title: "Overview",
    items: [
      { label: "Dashboard", href: "/app/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    title: "Management",
    items: [
      { label: "Properties", href: "/app/properties", icon: Building2, roles: MANAGER },
      { label: "Parking Spaces", href: "/app/spaces", icon: ParkingSquare, roles: MANAGER },
      { label: "Residents", href: "/app/residents", icon: Users, roles: MANAGER },
      { label: "Reservations", href: "/app/reservations", icon: CalendarRange, roles: MANAGER },
    ],
  },
  {
    title: "My Parking",
    items: [
      { label: "My Space", href: "/app/my-space", icon: Car },
      { label: "My Reservations", href: "/app/my-reservations", icon: ClipboardList },
      { label: "Guest Passes", href: "/app/guest-passes", icon: Ticket },
    ],
  },
  {
    title: "Insights",
    items: [
      { label: "Reports", href: "/app/reports", icon: ClipboardList, roles: MANAGER },
      { label: "AI Insights", href: "/app/ai-insights", icon: Sparkles, roles: MANAGER },
    ],
  },
  {
    title: "Admin",
    items: [
      { label: "Organizations", href: "/app/admin/organizations", icon: Building2, roles: ["platform_admin"] },
      { label: "Settings", href: "/app/settings", icon: Settings },
    ],
  },
];

/** Filter the nav tree down to what a given role may see. */
export function navForRole(role: UserRole): NavSection[] {
  return navSections
    .map((section) => ({
      ...section,
      items: section.items.filter(
        (item) => !item.roles || item.roles.includes(role),
      ),
    }))
    .filter((section) => section.items.length > 0);
}
