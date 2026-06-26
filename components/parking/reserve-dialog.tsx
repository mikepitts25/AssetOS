"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarCheck, Loader2 } from "lucide-react";

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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { createReservation } from "@/app/app/my-reservations/actions";
import { toDateTimeLocalValue } from "@/lib/dates";
import {
  RESERVATION_PURPOSE_LABELS,
  type ReservationPurpose,
} from "@/types/domain";

export function ReserveDialog({
  availabilityId,
  spaceLabel,
  windowStart,
  windowEnd,
}: {
  availabilityId: string;
  spaceLabel: string;
  windowStart: string;
  windowEnd: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createReservation(formData);
      if (result?.error) {
        toast({ variant: "destructive", title: "Couldn't reserve", description: result.error });
        return;
      }
      toast({
        variant: "success",
        title: "Reserved!",
        description: "Your reservation is confirmed.",
      });
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <CalendarCheck className="h-4 w-4" /> Reserve
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reserve {spaceLabel}</DialogTitle>
          <DialogDescription>
            Choose your window within the released availability and add your
            vehicle details.
          </DialogDescription>
        </DialogHeader>
        <form action={onSubmit} className="space-y-4">
          <input type="hidden" name="availability_id" value={availabilityId} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="starts_at">From</Label>
              <Input
                id="starts_at"
                name="starts_at"
                type="datetime-local"
                defaultValue={toDateTimeLocalValue(windowStart)}
                min={toDateTimeLocalValue(windowStart)}
                max={toDateTimeLocalValue(windowEnd)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ends_at">Until</Label>
              <Input
                id="ends_at"
                name="ends_at"
                type="datetime-local"
                defaultValue={toDateTimeLocalValue(windowEnd)}
                min={toDateTimeLocalValue(windowStart)}
                max={toDateTimeLocalValue(windowEnd)}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Purpose</Label>
            <Select name="purpose" defaultValue="resident_overflow">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(
                  Object.keys(
                    RESERVATION_PURPOSE_LABELS,
                  ) as ReservationPurpose[]
                ).map((p) => (
                  <SelectItem key={p} value={p}>
                    {RESERVATION_PURPOSE_LABELS[p]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="vehicle_plate">Plate</Label>
              <Input id="vehicle_plate" name="vehicle_plate" required />
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
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea id="notes" name="notes" />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirm reservation
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
