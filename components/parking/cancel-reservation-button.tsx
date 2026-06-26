"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { cancelReservation } from "@/app/app/my-reservations/actions";

export function CancelReservationButton({
  id,
  label = "Cancel",
}: {
  id: string;
  label?: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();

  function onCancel() {
    if (!confirm("Cancel this reservation?")) return;
    startTransition(async () => {
      const result = await cancelReservation(id);
      if (result?.error) {
        toast({ variant: "destructive", title: "Error", description: result.error });
        return;
      }
      toast({ variant: "success", title: "Reservation cancelled" });
      router.refresh();
    });
  }

  return (
    <Button variant="ghost" size="sm" onClick={onCancel} disabled={pending}>
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <X className="h-4 w-4" />
      )}
      {label}
    </Button>
  );
}
