"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Plus } from "lucide-react";

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { createSpace, updateSpace } from "@/app/app/spaces/actions";
import {
  SPACE_STATUS_LABELS,
  SPACE_TYPE_LABELS,
  type ParkingSpaceStatus,
  type ParkingSpaceType,
} from "@/types/domain";
import type { ParkingSpace, Property } from "@/types/database";

export function SpaceDialog({
  properties,
  space,
}: {
  properties: Pick<Property, "id" | "name">[];
  space?: ParkingSpace;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const editing = Boolean(space);

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      const result = editing
        ? await updateSpace(space!.id, formData)
        : await createSpace(formData);
      if (result?.error) {
        toast({ variant: "destructive", title: "Error", description: result.error });
        return;
      }
      toast({
        variant: "success",
        title: editing ? "Space updated" : "Space created",
      });
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {editing ? (
          <Button variant="outline" size="sm">
            <Pencil className="h-4 w-4" /> Edit
          </Button>
        ) : (
          <Button>
            <Plus className="h-4 w-4" /> New space
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit space" : "New parking space"}</DialogTitle>
          <DialogDescription>
            Configure a parking space and how it can be used.
          </DialogDescription>
        </DialogHeader>
        <form action={onSubmit} className="space-y-4">
          {!editing && (
            <div className="space-y-2">
              <Label>Property *</Label>
              <Select name="property_id" defaultValue={properties[0]?.id} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select property" />
                </SelectTrigger>
                <SelectContent>
                  {properties.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="space_number">Space number *</Label>
              <Input
                id="space_number"
                name="space_number"
                defaultValue={space?.space_number}
                placeholder="G-01"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="level_or_zone">Level / Zone</Label>
              <Input
                id="level_or_zone"
                name="level_or_zone"
                defaultValue={space?.level_or_zone ?? ""}
                placeholder="Level P1"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="label">Label</Label>
            <Input
              id="label"
              name="label"
              defaultValue={space?.label ?? ""}
              placeholder="Optional friendly name"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select name="type" defaultValue={space?.type ?? "standard"}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(SPACE_TYPE_LABELS) as ParkingSpaceType[]).map(
                    (t) => (
                      <SelectItem key={t} value={t}>
                        {SPACE_TYPE_LABELS[t]}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select name="status" defaultValue={space?.status ?? "active"}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(
                    Object.keys(SPACE_STATUS_LABELS) as ParkingSpaceStatus[]
                  ).map((s) => (
                    <SelectItem key={s} value={s}>
                      {SPACE_STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="is_assignable"
                defaultChecked={space?.is_assignable ?? true}
                className="h-4 w-4 rounded border-input"
              />
              Assignable
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="is_reservable"
                defaultChecked={space?.is_reservable ?? true}
                className="h-4 w-4 rounded border-input"
              />
              Reservable
            </label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" defaultValue={space?.notes ?? ""} />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing ? "Save changes" : "Create space"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
