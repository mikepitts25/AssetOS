"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { cancelVisitorPass } from "@/app/app/guest-passes/actions";

export function CancelPassButton({ id }: { id: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();

  function onCancel() {
    if (!confirm("Cancel this guest pass?")) return;
    startTransition(async () => {
      const result = await cancelVisitorPass(id);
      if (result?.error) {
        toast({ variant: "destructive", title: "Error", description: result.error });
        return;
      }
      toast({ variant: "success", title: "Pass cancelled" });
      router.refresh();
    });
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onCancel}
      disabled={pending}
      className="w-full"
    >
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      Cancel pass
    </Button>
  );
}
