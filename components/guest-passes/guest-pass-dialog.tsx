"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { createVisitorPass } from "@/app/app/guest-passes/actions";
import type { Property } from "@/types/database";

export function GuestPassDialog({
  properties,
}: {
  properties: Pick<Property, "id" | "name">[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createVisitorPass(formData);
      if (result?.error) {
        toast({ variant: "destructive", title: "Error", description: result.error });
        return;
      }
      toast({ variant: "success", title: "Guest pass created" });
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={properties.length === 0}>
          <Plus className="h-4 w-4" /> New guest pass
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create guest pass</DialogTitle>
          <DialogDescription>
            Issue a visitor parking pass. A scannable token is generated
            automatically.
          </DialogDescription>
        </DialogHeader>
        <form action={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Property</Label>
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
          <div className="space-y-2">
            <Label htmlFor="guest_name">Guest name *</Label>
            <Input id="guest_name" name="guest_name" required />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="vehicle_plate">Plate</Label>
              <Input id="vehicle_plate" name="vehicle_plate" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vehicle_make">Make</Label>
              <Input id="vehicle_make" name="vehicle_make" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vehicle_model">Model</Label>
              <Input id="vehicle_model" name="vehicle_model" />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="starts_at">Valid from</Label>
              <Input
                id="starts_at"
                name="starts_at"
                type="datetime-local"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ends_at">Valid until</Label>
              <Input
                id="ends_at"
                name="ends_at"
                type="datetime-local"
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              Create pass
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
