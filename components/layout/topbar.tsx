"use client";

import { useRouter } from "next/navigation";
import { LogOut, Menu, UserCircle } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { initials } from "@/lib/utils";
import { USER_ROLE_LABELS } from "@/types/domain";
import type { Organization, Profile } from "@/types/database";

export function Topbar({
  profile,
  organization,
  onOpenSidebar,
}: {
  profile: Profile;
  organization: Organization;
  onOpenSidebar: () => void;
}) {
  const router = useRouter();
  const supabase = createClient();

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/sign-in");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b bg-background/80 px-4 backdrop-blur sm:px-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onOpenSidebar}
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{organization.name}</span>
          {organization.is_demo && (
            <Badge variant="warning" className="text-[10px]">
              Demo
            </Badge>
          )}
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-auto gap-2 px-2 py-1.5">
            <Avatar>
              <AvatarFallback>
                {initials(profile.first_name, profile.last_name)}
              </AvatarFallback>
            </Avatar>
            <div className="hidden text-left sm:block">
              <p className="text-sm font-medium leading-tight">
                {profile.first_name} {profile.last_name}
              </p>
              <p className="text-xs text-muted-foreground">
                {USER_ROLE_LABELS[profile.role]}
              </p>
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>
            <div className="space-y-0.5">
              <p className="text-sm">{profile.email}</p>
              <p className="text-xs font-normal text-muted-foreground">
                {USER_ROLE_LABELS[profile.role]}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => router.push("/app/settings")}>
            <UserCircle className="h-4 w-4" />
            Settings
          </DropdownMenuItem>
          <DropdownMenuItem onClick={signOut}>
            <LogOut className="h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
