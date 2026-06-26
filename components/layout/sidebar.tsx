"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CarFront } from "lucide-react";

import { cn } from "@/lib/utils";
import { navForRole } from "@/components/layout/nav-config";
import { Badge } from "@/components/ui/badge";
import type { UserRole } from "@/types/domain";

export function SidebarNav({
  role,
  onNavigate,
}: {
  role: UserRole;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const sections = navForRole(role);

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <Link
          href="/app/dashboard"
          className="flex items-center gap-2 font-semibold"
          onClick={onNavigate}
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <CarFront className="h-5 w-5" />
          </span>
          <span className="tracking-tight">AssetOS</span>
          <Badge variant="secondary" className="text-[10px]">
            Parking
          </Badge>
        </Link>
      </div>
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
        {sections.map((section) => (
          <div key={section.title}>
            <p className="px-3 pb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {section.title}
            </p>
            <ul className="space-y-1">
              {section.items.map((item) => {
                const active =
                  pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        active
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </div>
  );
}
