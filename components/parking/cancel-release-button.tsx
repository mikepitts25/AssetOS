"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { cancelRelease } from "@/app/app/my-space/actions";

export function CancelReleaseButton({ id }: { id: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();

  function onCancel() {
    startTransition(async () => {
      const result = await cancelRelease(id);
      if (result?.error) {
        toast({ variant: "destructive", title: "Error", description: result.error });
        return;
      }
      toast({ variant: "success", title: "Release cancelled" });
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
      Cancel
    </Button>
  );
}
