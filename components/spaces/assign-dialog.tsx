"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserPlus, UserMinus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { assignSpace, unassignSpace } from "@/app/app/spaces/actions";
import type { Profile } from "@/types/database";

export function AssignDialog({
  spaceId,
  residents,
  currentResidentId,
  triggerLabel = "Assign",
}: {
  spaceId: string;
  residents: Pick<Profile, "id" | "first_name" | "last_name" | "unit_number">[];
  currentResidentId?: string | null;
  triggerLabel?: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [residentId, setResidentId] = useState(currentResidentId ?? "");
  const [pending, startTransition] = useTransition();

  function onAssign() {
    if (!residentId) {
      toast({ variant: "destructive", title: "Select a resident" });
      return;
    }
    startTransition(async () => {
      const result = await assignSpace(spaceId, residentId);
      if (result?.error) {
        toast({ variant: "destructive", title: "Error", description: result.error });
        return;
      }
      toast({ variant: "success", title: "Space assigned" });
      setOpen(false);
      router.refresh();
    });
  }

  function onUnassign() {
    startTransition(async () => {
      const result = await unassignSpace(spaceId);
      if (result?.error) {
        toast({ variant: "destructive", title: "Error", description: result.error });
        return;
      }
      toast({ variant: "success", title: "Space unassigned" });
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <UserPlus className="h-4 w-4" /> {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign space</DialogTitle>
          <DialogDescription>
            Set the primary resident for this parking space. Any existing
            assignment will be ended.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label>Resident</Label>
          <Select value={residentId} onValueChange={setResidentId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a resident" />
            </SelectTrigger>
            <SelectContent>
              {residents.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.first_name} {r.last_name}
                  {r.unit_number ? ` · ${r.unit_number}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter className="sm:justify-between">
          {currentResidentId && (
            <Button
              variant="ghost"
              onClick={onUnassign}
              disabled={pending}
              className="text-destructive"
            >
              <UserMinus className="h-4 w-4" /> Unassign
            </Button>
          )}
          <Button onClick={onAssign} disabled={pending}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            Assign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
