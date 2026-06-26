"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, Loader2 } from "lucide-react";

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
import { useToast } from "@/components/ui/use-toast";
import { releaseSpace } from "@/app/app/my-space/actions";

export function ReleaseDialog({
  spaceId,
  spaceLabel,
}: {
  spaceId: string;
  spaceLabel: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await releaseSpace(formData);
      if (result?.error) {
        toast({ variant: "destructive", title: "Error", description: result.error });
        return;
      }
      toast({
        variant: "success",
        title: "Space released",
        description: "Neighbors can now reserve it for the chosen window.",
      });
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <CalendarPlus className="h-4 w-4" /> Release my space
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Release {spaceLabel}</DialogTitle>
          <DialogDescription>
            Make your space available for others to reserve while you&apos;re
            away.
          </DialogDescription>
        </DialogHeader>
        <form action={onSubmit} className="space-y-4">
          <input type="hidden" name="parking_space_id" value={spaceId} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="starts_at">Available from</Label>
              <Input
                id="starts_at"
                name="starts_at"
                type="datetime-local"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ends_at">Available until</Label>
              <Input
                id="ends_at"
                name="ends_at"
                type="datetime-local"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Note (optional)</Label>
            <Textarea
              id="notes"
              name="notes"
              placeholder="e.g. Out of town for the week."
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              Release space
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
