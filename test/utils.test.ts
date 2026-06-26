import { describe, expect, it } from "vitest";

import { initials, humanize, cn } from "@/lib/utils";
import { isValidWindow } from "@/lib/availability";

describe("initials", () => {
  it("builds uppercase initials from first and last name", () => {
    expect(initials("Mike", "Pitts")).toBe("MP");
  });

  it("handles missing parts", () => {
    expect(initials("Alex", null)).toBe("A");
    expect(initials(null, null)).toBe("?");
    expect(initials("", "")).toBe("?");
  });
});

describe("humanize", () => {
  it("title-cases snake_case enum values", () => {
    expect(humanize("ev_charging")).toBe("Ev Charging");
    expect(humanize("resident_overflow")).toBe("Resident Overflow");
    expect(humanize("garage")).toBe("Garage");
  });
});

describe("cn", () => {
  it("merges class names and resolves Tailwind conflicts", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
    expect(cn("text-sm", false && "hidden", "font-bold")).toBe(
      "text-sm font-bold",
    );
  });
});

describe("isValidWindow", () => {
  it("accepts a window where end is after start", () => {
    expect(
      isValidWindow("2026-07-01T08:00:00Z", "2026-07-01T10:00:00Z"),
    ).toBe(true);
  });

  it("rejects a zero-length or inverted window", () => {
    expect(
      isValidWindow("2026-07-01T10:00:00Z", "2026-07-01T10:00:00Z"),
    ).toBe(false);
    expect(
      isValidWindow("2026-07-01T10:00:00Z", "2026-07-01T08:00:00Z"),
    ).toBe(false);
  });

  it("rejects unparseable dates", () => {
    expect(isValidWindow("not-a-date", "2026-07-01T10:00:00Z")).toBe(false);
  });
});
