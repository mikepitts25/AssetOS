import { MANAGER_ROLES, type UserRole } from "@/types/domain";

/** True for org_admin / property_manager / platform_admin. */
export function isManager(role: UserRole): boolean {
  return MANAGER_ROLES.includes(role);
}

export function isPlatformAdmin(role: UserRole): boolean {
  return role === "platform_admin";
}

export function isOrgAdmin(role: UserRole): boolean {
  return role === "org_admin" || role === "platform_admin";
}

export function isResident(role: UserRole): boolean {
  return role === "resident";
}

/**
 * Capability map — the app layer asks "can this role do X?" rather than
 * checking role strings inline. RLS is the real enforcement boundary;
 * these checks keep the UI honest and reduce accidental exposure.
 */
export const can = {
  manageProperties: (role: UserRole) => isManager(role),
  manageSpaces: (role: UserRole) => isManager(role),
  manageResidents: (role: UserRole) => isManager(role),
  manageAllReservations: (role: UserRole) => isManager(role),
  viewReports: (role: UserRole) => isManager(role),
  manageOrganizations: (role: UserRole) => isPlatformAdmin(role),
  changeUserRoles: (role: UserRole) => isOrgAdmin(role),
  releaseOwnSpace: (role: UserRole) => isResident(role) || isManager(role),
  createReservation: () => true,
  createVisitorPass: () => true,
};
