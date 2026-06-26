"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { archiveProperty } from "@/app/app/properties/actions";

export function ArchiveButton({ propertyId }: { propertyId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();

  function onArchive() {
    if (!confirm("Archive this property? It will be hidden from active lists.")) {
      return;
    }
    startTransition(async () => {
      const result = await archiveProperty(propertyId);
      if (result?.error) {
        toast({ variant: "destructive", title: "Error", description: result.error });
        return;
      }
      toast({ variant: "success", title: "Property archived" });
      router.push("/app/properties");
      router.refresh();
    });
  }

  return (
    <Button variant="outline" size="sm" onClick={onArchive} disabled={pending}>
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Archive className="h-4 w-4" />
      )}
      Archive
    </Button>
  );
}
