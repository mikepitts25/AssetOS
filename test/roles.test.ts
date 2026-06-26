import { describe, expect, it } from "vitest";

import { can, isManager, isOrgAdmin, isPlatformAdmin, isResident } from "@/lib/roles";
import type { UserRole } from "@/types/domain";

const ROLES: UserRole[] = [
  "platform_admin",
  "org_admin",
  "property_manager",
  "resident",
];

describe("role predicates", () => {
  it("isManager is true for managers and admins, false for residents", () => {
    expect(isManager("org_admin")).toBe(true);
    expect(isManager("property_manager")).toBe(true);
    expect(isManager("platform_admin")).toBe(true);
    expect(isManager("resident")).toBe(false);
  });

  it("isPlatformAdmin only matches platform_admin", () => {
    expect(isPlatformAdmin("platform_admin")).toBe(true);
    for (const r of ROLES.filter((r) => r !== "platform_admin")) {
      expect(isPlatformAdmin(r)).toBe(false);
    }
  });

  it("isOrgAdmin matches org_admin and platform_admin", () => {
    expect(isOrgAdmin("org_admin")).toBe(true);
    expect(isOrgAdmin("platform_admin")).toBe(true);
    expect(isOrgAdmin("property_manager")).toBe(false);
    expect(isOrgAdmin("resident")).toBe(false);
  });

  it("isResident only matches resident", () => {
    expect(isResident("resident")).toBe(true);
    expect(isResident("org_admin")).toBe(false);
  });
});

describe("capability map", () => {
  it("management capabilities require a manager role", () => {
    expect(can.manageProperties("property_manager")).toBe(true);
    expect(can.manageProperties("resident")).toBe(false);
    expect(can.viewReports("resident")).toBe(false);
    expect(can.viewReports("org_admin")).toBe(true);
  });

  it("changing user roles requires org admin", () => {
    expect(can.changeUserRoles("org_admin")).toBe(true);
    expect(can.changeUserRoles("property_manager")).toBe(false);
  });

  it("managing organizations requires platform admin", () => {
    expect(can.manageOrganizations("platform_admin")).toBe(true);
    expect(can.manageOrganizations("org_admin")).toBe(false);
  });

  it("anyone can create reservations and visitor passes", () => {
    expect(can.createReservation()).toBe(true);
    expect(can.createVisitorPass()).toBe(true);
  });

  it("residents and managers can release their own space", () => {
    expect(can.releaseOwnSpace("resident")).toBe(true);
    expect(can.releaseOwnSpace("property_manager")).toBe(true);
  });
});
