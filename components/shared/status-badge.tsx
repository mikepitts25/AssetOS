import { Badge, type BadgeProps } from "@/components/ui/badge";
import {
  AVAILABILITY_STATUS_LABELS,
  RESERVATION_STATUS_LABELS,
  SPACE_STATUS_LABELS,
  VISITOR_PASS_STATUS_LABELS,
  type AvailabilityStatus,
  type ParkingSpaceStatus,
  type ReservationStatus,
  type UserStatus,
  type VisitorPassStatus,
} from "@/types/domain";
import { humanize } from "@/lib/utils";

type Variant = NonNullable<BadgeProps["variant"]>;

const RESERVATION_VARIANTS: Record<ReservationStatus, Variant> = {
  pending: "warning",
  confirmed: "success",
  completed: "secondary",
  cancelled: "muted",
  rejected: "destructive",
};

const AVAILABILITY_VARIANTS: Record<AvailabilityStatus, Variant> = {
  available: "success",
  reserved: "default",
  cancelled: "muted",
  expired: "muted",
};

const SPACE_VARIANTS: Record<ParkingSpaceStatus, Variant> = {
  active: "success",
  inactive: "muted",
  maintenance: "warning",
};

const VISITOR_VARIANTS: Record<VisitorPassStatus, Variant> = {
  active: "success",
  expired: "muted",
  cancelled: "destructive",
};

const USER_VARIANTS: Record<UserStatus, Variant> = {
  active: "success",
  invited: "warning",
  suspended: "destructive",
};

export function ReservationStatusBadge({ status }: { status: ReservationStatus }) {
  return (
    <Badge variant={RESERVATION_VARIANTS[status]}>
      {RESERVATION_STATUS_LABELS[status]}
    </Badge>
  );
}

export function AvailabilityStatusBadge({
  status,
}: {
  status: AvailabilityStatus;
}) {
  return (
    <Badge variant={AVAILABILITY_VARIANTS[status]}>
      {AVAILABILITY_STATUS_LABELS[status]}
    </Badge>
  );
}

export function SpaceStatusBadge({ status }: { status: ParkingSpaceStatus }) {
  return (
    <Badge variant={SPACE_VARIANTS[status]}>{SPACE_STATUS_LABELS[status]}</Badge>
  );
}

export function VisitorPassStatusBadge({
  status,
}: {
  status: VisitorPassStatus;
}) {
  return (
    <Badge variant={VISITOR_VARIANTS[status]}>
      {VISITOR_PASS_STATUS_LABELS[status]}
    </Badge>
  );
}

export function UserStatusBadge({ status }: { status: UserStatus }) {
  return <Badge variant={USER_VARIANTS[status]}>{humanize(status)}</Badge>;
}
