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
import { useToast } from "@/components/ui/use-toast";
import { createProperty, updateProperty } from "@/app/app/properties/actions";
import type { Property } from "@/types/database";

export function PropertyDialog({ property }: { property?: Property }) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const editing = Boolean(property);

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      const result = editing
        ? await updateProperty(property!.id, formData)
        : await createProperty(formData);

      if (result?.error) {
        toast({ variant: "destructive", title: "Error", description: result.error });
        return;
      }
      toast({
        variant: "success",
        title: editing ? "Property updated" : "Property created",
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
            <Plus className="h-4 w-4" /> New property
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit property" : "New property"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Update the details for this property."
              : "Add a building or community to your organization."}
          </DialogDescription>
        </DialogHeader>
        <form action={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input id="name" name="name" defaultValue={property?.name} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address_line_1">Address</Label>
            <Input
              id="address_line_1"
              name="address_line_1"
              defaultValue={property?.address_line_1 ?? ""}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" name="city" defaultValue={property?.city ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state_region">State / Region</Label>
              <Input
                id="state_region"
                name="state_region"
                defaultValue={property?.state_region ?? ""}
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="postal_code">Postal code</Label>
              <Input
                id="postal_code"
                name="postal_code"
                defaultValue={property?.postal_code ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                name="country"
                defaultValue={property?.country ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Input
                id="timezone"
                name="timezone"
                defaultValue={property?.timezone ?? "UTC"}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={property?.description ?? ""}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing ? "Save changes" : "Create property"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
