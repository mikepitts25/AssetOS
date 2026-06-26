"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SpaceStatusBadge } from "@/components/shared/status-badge";
import { SpaceDialog } from "@/components/spaces/space-dialog";
import { AssignDialog } from "@/components/spaces/assign-dialog";
import { SPACE_TYPE_LABELS, type ParkingSpaceType } from "@/types/domain";
import type { ParkingSpace, Profile, Property } from "@/types/database";

export interface SpaceRow extends ParkingSpace {
  propertyName: string;
  assignedResidentId: string | null;
  assignedResidentName: string | null;
}

export function SpacesTable({
  spaces,
  properties,
  residents,
}: {
  spaces: SpaceRow[];
  properties: Pick<Property, "id" | "name">[];
  residents: Pick<Profile, "id" | "first_name" | "last_name" | "unit_number">[];
}) {
  const [propertyFilter, setPropertyFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const filtered = useMemo(() => {
    return spaces.filter(
      (s) =>
        (propertyFilter === "all" || s.property_id === propertyFilter) &&
        (typeFilter === "all" || s.type === typeFilter),
    );
  }, [spaces, propertyFilter, typeFilter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Select value={propertyFilter} onValueChange={setPropertyFilter}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="All properties" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All properties</SelectItem>
            {properties.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {(Object.keys(SPACE_TYPE_LABELS) as ParkingSpaceType[]).map((t) => (
              <SelectItem key={t} value={t}>
                {SPACE_TYPE_LABELS[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Space</TableHead>
              <TableHead>Property</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Assigned to</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">
                  <Link href={`/app/spaces/${s.id}`} className="hover:underline">
                    {s.space_number}
                  </Link>
                  {s.level_or_zone && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      {s.level_or_zone}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {s.propertyName}
                </TableCell>
                <TableCell>{SPACE_TYPE_LABELS[s.type]}</TableCell>
                <TableCell>
                  <SpaceStatusBadge status={s.status} />
                </TableCell>
                <TableCell>
                  {s.assignedResidentName ? (
                    <Badge variant="secondary">{s.assignedResidentName}</Badge>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      Unassigned
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <SpaceDialog properties={properties} space={s} />
                    <AssignDialog
                      spaceId={s.id}
                      residents={residents}
                      currentResidentId={s.assignedResidentId}
                      triggerLabel={s.assignedResidentId ? "Reassign" : "Assign"}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  No spaces match these filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
