// ============================================================
// AssetOS / ParkingOS — Database types
// ============================================================
// Hand-written to match the SQL migrations. In a production setup
// these would be generated with `supabase gen types typescript`,
// but keeping them checked in keeps the MVP runnable without the
// Supabase CLI being connected.
//
// NOTE: these are `type` aliases (not `interface`) on purpose —
// supabase-js's GenericSchema constraint requires row types to be
// assignable to Record<string, unknown>, which object-literal type
// aliases satisfy but interfaces do not.
// ============================================================

import type {
  AssignmentStatus,
  AvailabilityStatus,
  ParkingSpaceStatus,
  ParkingSpaceType,
  ReservationPurpose,
  ReservationStatus,
  UserRole,
  UserStatus,
  VisitorPassStatus,
} from "./domain";

export type Organization = {
  id: string;
  name: string;
  slug: string;
  type: string | null;
  is_demo: boolean;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type Profile = {
  id: string;
  auth_user_id: string | null;
  organization_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  status: UserStatus;
  unit_number: string | null;
  created_at: string;
  updated_at: string;
};

export type Property = {
  id: string;
  organization_id: string;
  name: string;
  address_line_1: string | null;
  address_line_2: string | null;
  city: string | null;
  state_region: string | null;
  postal_code: string | null;
  country: string | null;
  timezone: string;
  description: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
};

export type ParkingSpace = {
  id: string;
  organization_id: string;
  property_id: string;
  space_number: string;
  label: string | null;
  level_or_zone: string | null;
  type: ParkingSpaceType;
  status: ParkingSpaceStatus;
  is_assignable: boolean;
  is_reservable: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type ParkingAssignment = {
  id: string;
  organization_id: string;
  property_id: string;
  parking_space_id: string;
  resident_id: string;
  starts_at: string;
  ends_at: string | null;
  status: AssignmentStatus;
  created_at: string;
  updated_at: string;
};

export type SpaceAvailability = {
  id: string;
  organization_id: string;
  property_id: string;
  parking_space_id: string;
  released_by_resident_id: string;
  starts_at: string;
  ends_at: string;
  status: AvailabilityStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type Reservation = {
  id: string;
  organization_id: string;
  property_id: string;
  parking_space_id: string;
  availability_id: string | null;
  reserved_by_resident_id: string;
  starts_at: string;
  ends_at: string;
  status: ReservationStatus;
  purpose: ReservationPurpose;
  vehicle_plate: string | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type VisitorPass = {
  id: string;
  organization_id: string;
  property_id: string;
  resident_id: string;
  guest_name: string;
  vehicle_plate: string | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  starts_at: string;
  ends_at: string;
  status: VisitorPassStatus;
  qr_code_token: string;
  created_at: string;
  updated_at: string;
};

export type AuditLog = {
  id: string;
  organization_id: string;
  actor_profile_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

// Generic table row map used by the typed Supabase client below.
type TableShape<Row extends Record<string, unknown>> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      organizations: TableShape<Organization>;
      profiles: TableShape<Profile>;
      properties: TableShape<Property>;
      parking_spaces: TableShape<ParkingSpace>;
      parking_assignments: TableShape<ParkingAssignment>;
      space_availabilities: TableShape<SpaceAvailability>;
      reservations: TableShape<Reservation>;
      visitor_passes: TableShape<VisitorPass>;
      audit_logs: TableShape<AuditLog>;
    };
    Views: { [_ in never]: never };
    Functions: {
      is_space_available: {
        Args: {
          p_space_id: string;
          p_starts_at: string;
          p_ends_at: string;
          p_ignore_reservation_id?: string | null;
        };
        Returns: boolean;
      };
      reserve_space: {
        Args: {
          p_availability_id: string;
          p_resident_id: string;
          p_starts_at: string;
          p_ends_at: string;
          p_purpose?: ReservationPurpose;
          p_vehicle_plate?: string | null;
          p_vehicle_make?: string | null;
          p_vehicle_model?: string | null;
          p_notes?: string | null;
        };
        Returns: Reservation;
      };
      expire_stale_records: {
        Args: Record<string, never>;
        Returns: {
          expired_availabilities: number;
          expired_visitor_passes: number;
          completed_reservations: number;
        }[];
      };
    };
    Enums: { [_ in never]: never };
  };
};
