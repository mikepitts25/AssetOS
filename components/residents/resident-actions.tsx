"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/use-toast";
import {
  changeResidentRole,
  setResidentStatus,
} from "@/app/app/residents/actions";
import { USER_ROLE_LABELS, type UserRole, type UserStatus } from "@/types/domain";
import type { Profile } from "@/types/database";

const ROLES: UserRole[] = ["resident", "property_manager", "org_admin"];

export function ResidentActions({
  resident,
  canChangeRole,
}: {
  resident: Pick<Profile, "id" | "status" | "role">;
  canChangeRole: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();

  function run(fn: () => Promise<{ error?: string; success?: boolean }>) {
    startTransition(async () => {
      const result = await fn();
      if (result?.error) {
        toast({ variant: "destructive", title: "Error", description: result.error });
        return;
      }
      toast({ variant: "success", title: "Updated" });
      router.refresh();
    });
  }

  function changeStatus(status: UserStatus) {
    run(() => setResidentStatus(resident.id, status));
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" disabled={pending}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Status</DropdownMenuLabel>
        {resident.status !== "active" && (
          <DropdownMenuItem onClick={() => changeStatus("active")}>
            Mark active
          </DropdownMenuItem>
        )}
        {resident.status !== "suspended" && (
          <DropdownMenuItem
            onClick={() => changeStatus("suspended")}
            className="text-destructive"
          >
            Suspend
          </DropdownMenuItem>
        )}
        {canChangeRole && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Change role</DropdownMenuLabel>
            {ROLES.filter((r) => r !== resident.role).map((r) => (
              <DropdownMenuItem
                key={r}
                onClick={() => run(() => changeResidentRole(resident.id, r))}
              >
                {USER_ROLE_LABELS[r]}
              </DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
