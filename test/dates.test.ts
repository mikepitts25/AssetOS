import { describe, expect, it } from "vitest";

import {
  formatDate,
  formatDateTime,
  formatTime,
  hoursBetween,
  toDateTimeLocalValue,
} from "@/lib/dates";

describe("hoursBetween", () => {
  it("returns whole hours between two timestamps", () => {
    expect(
      hoursBetween("2026-07-01T08:00:00Z", "2026-07-01T11:00:00Z"),
    ).toBe(3);
  });

  it("rounds to the nearest hour", () => {
    expect(
      hoursBetween("2026-07-01T08:00:00Z", "2026-07-01T09:40:00Z"),
    ).toBe(2);
  });

  it("never returns a negative value when end precedes start", () => {
    expect(
      hoursBetween("2026-07-01T11:00:00Z", "2026-07-01T08:00:00Z"),
    ).toBe(0);
  });

  it("accepts Date objects", () => {
    const start = new Date("2026-07-01T00:00:00Z");
    const end = new Date("2026-07-02T00:00:00Z");
    expect(hoursBetween(start, end)).toBe(24);
  });
});

describe("formatters", () => {
  // Use a fixed local Date so output doesn't depend on timezone parsing.
  const d = new Date(2026, 6, 1, 8, 0); // Jul 1 2026, 08:00 local

  it("formatDate renders a friendly date", () => {
    expect(formatDate(d)).toBe("Jul 1, 2026");
  });

  it("formatTime renders 12-hour time", () => {
    expect(formatTime(d)).toBe("8:00 AM");
  });

  it("formatDateTime combines date and time", () => {
    expect(formatDateTime(d)).toBe("Jul 1, 2026, 8:00 AM");
  });

  it("toDateTimeLocalValue produces an input-friendly value", () => {
    expect(toDateTimeLocalValue(d)).toBe("2026-07-01T08:00");
  });
});
