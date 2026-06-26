"use client";

import { useMemo, useState } from "react";

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
import { ReservationStatusBadge } from "@/components/shared/status-badge";
import { CancelReservationButton } from "@/components/parking/cancel-reservation-button";
import { formatDateTime } from "@/lib/dates";
import {
  RESERVATION_PURPOSE_LABELS,
  RESERVATION_STATUS_LABELS,
  type ReservationStatus,
} from "@/types/domain";
import type { Reservation } from "@/types/database";

export interface ReservationRow extends Reservation {
  spaceLabel: string;
  propertyName: string;
  reservedByName: string;
  releasedByName: string | null;
}

export function ReservationsTable({
  reservations,
  properties,
}: {
  reservations: ReservationRow[];
  properties: { id: string; name: string }[];
}) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [propertyFilter, setPropertyFilter] = useState("all");

  const filtered = useMemo(
    () =>
      reservations.filter(
        (r) =>
          (statusFilter === "all" || r.status === statusFilter) &&
          (propertyFilter === "all" || r.property_id === propertyFilter),
      ),
    [reservations, statusFilter, propertyFilter],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {(
              Object.keys(RESERVATION_STATUS_LABELS) as ReservationStatus[]
            ).map((s) => (
              <SelectItem key={s} value={s}>
                {RESERVATION_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
      </div>

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Space</TableHead>
              <TableHead>Window</TableHead>
              <TableHead>Reserved by</TableHead>
              <TableHead>Released by</TableHead>
              <TableHead>Purpose</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((r) => {
              const cancellable =
                r.status === "confirmed" || r.status === "pending";
              return (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">
                    {r.spaceLabel}
                    <span className="block text-xs text-muted-foreground">
                      {r.propertyName}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatDateTime(r.starts_at)} → {formatDateTime(r.ends_at)}
                  </TableCell>
                  <TableCell>{r.reservedByName}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {r.releasedByName ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {RESERVATION_PURPOSE_LABELS[r.purpose]}
                  </TableCell>
                  <TableCell>
                    <ReservationStatusBadge status={r.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    {cancellable && <CancelReservationButton id={r.id} />}
                  </TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  No reservations match these filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
