"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";
import { SidebarNav } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import type { Organization, Profile } from "@/types/database";

export function AppShell({
  profile,
  organization,
  children,
}: {
  profile: Profile;
  organization: Organization;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-muted/20">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r bg-background lg:block">
        <SidebarNav role={profile.role} />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div
            className={cn(
              "absolute inset-y-0 left-0 w-64 border-r bg-background shadow-xl",
            )}
          >
            <SidebarNav
              role={profile.role}
              onNavigate={() => setMobileOpen(false)}
            />
          </div>
        </div>
      )}

      <div className="lg:pl-64">
        <Topbar
          profile={profile}
          organization={organization}
          onOpenSidebar={() => setMobileOpen(true)}
        />
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
