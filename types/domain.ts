// ============================================================
// AssetOS / ParkingOS — Domain enums & shared types
// ============================================================
// These mirror the Postgres enum types defined in the migrations.
// Keeping them here gives the app a single source of truth that is
// independent of the generated database types.
// ============================================================

export type UserRole =
  | "platform_admin"
  | "org_admin"
  | "property_manager"
  | "resident";

export type UserStatus = "active" | "invited" | "suspended";

export type ParkingSpaceType =
  | "standard"
  | "compact"
  | "ev_charging"
  | "handicap"
  | "motorcycle"
  | "covered"
  | "garage";

export type ParkingSpaceStatus = "active" | "inactive" | "maintenance";

export type AssignmentStatus = "active" | "ended";

export type AvailabilityStatus =
  | "available"
  | "reserved"
  | "cancelled"
  | "expired";

export type ReservationStatus =
  | "pending"
  | "confirmed"
  | "cancelled"
  | "completed"
  | "rejected";

export type ReservationPurpose =
  | "resident_overflow"
  | "guest"
  | "temporary_vehicle"
  | "other";

export type VisitorPassStatus = "active" | "expired" | "cancelled";

// ------------------------------------------------------------
// Human-readable labels for select inputs & badges.
// ------------------------------------------------------------
export const USER_ROLE_LABELS: Record<UserRole, string> = {
  platform_admin: "Platform Admin",
  org_admin: "Org Admin",
  property_manager: "Property Manager",
  resident: "Resident",
};

export const SPACE_TYPE_LABELS: Record<ParkingSpaceType, string> = {
  standard: "Standard",
  compact: "Compact",
  ev_charging: "EV Charging",
  handicap: "Accessible",
  motorcycle: "Motorcycle",
  covered: "Covered",
  garage: "Garage",
};

export const SPACE_STATUS_LABELS: Record<ParkingSpaceStatus, string> = {
  active: "Active",
  inactive: "Inactive",
  maintenance: "Maintenance",
};

export const RESERVATION_STATUS_LABELS: Record<ReservationStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  cancelled: "Cancelled",
  completed: "Completed",
  rejected: "Rejected",
};

export const RESERVATION_PURPOSE_LABELS: Record<ReservationPurpose, string> = {
  resident_overflow: "Resident Overflow",
  guest: "Guest",
  temporary_vehicle: "Temporary Vehicle",
  other: "Other",
};

export const AVAILABILITY_STATUS_LABELS: Record<AvailabilityStatus, string> = {
  available: "Available",
  reserved: "Reserved",
  cancelled: "Cancelled",
  expired: "Expired",
};

export const VISITOR_PASS_STATUS_LABELS: Record<VisitorPassStatus, string> = {
  active: "Active",
  expired: "Expired",
  cancelled: "Cancelled",
};

// Roles considered "management" tier in the app layer.
export const MANAGER_ROLES: UserRole[] = [
  "platform_admin",
  "org_admin",
  "property_manager",
];
