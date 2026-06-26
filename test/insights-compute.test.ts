import { describe, expect, it } from "vitest";

import { computeInsights, type InsightInput } from "@/lib/insights-compute";

const EMPTY: InsightInput = {
  properties: [],
  spaces: [],
  assignments: [],
  availabilities: [],
  reservations: [],
  visitorPasses: [],
};

describe("computeInsights", () => {
  it("falls back to a healthy message when there is nothing to flag", () => {
    const insights = computeInsights(EMPTY);
    expect(insights).toHaveLength(1);
    expect(insights[0].title).toBe("Everything looks healthy");
    expect(insights[0].severity).toBe("info");
  });

  it("flags unused capacity, a conversion opportunity, and no reservations", () => {
    const insights = computeInsights({
      ...EMPTY,
      properties: [{ id: "p1", name: "Stuttgart Heights" }],
      spaces: [
        { id: "s1", property_id: "p1", level_or_zone: "Level 1" },
        { id: "s2", property_id: "p1", level_or_zone: "Level 1" },
        { id: "s3", property_id: "p1", level_or_zone: "Level 1" },
        { id: "s4", property_id: "p1", level_or_zone: "Level 1" },
      ],
    });

    const titles = insights.map((i) => i.title);
    expect(titles).toContain(
      "Stuttgart Heights has the most unused parking capacity",
    );
    expect(
      titles.some((t) => t.startsWith("Consider converting")),
    ).toBe(true);
    expect(titles).toContain("No completed reservations yet");
    // The healthy fallback must NOT appear once real insights exist.
    expect(titles).not.toContain("Everything looks healthy");
  });

  it("detects weekend-skewed demand", () => {
    const insights = computeInsights({
      ...EMPTY,
      // local datetimes (no Z) so getDay() is unambiguous: Jul 4/5 2026 = Sat/Sun
      reservations: [{ starts_at: "2026-07-04T12:00:00", status: "pending" }],
      visitorPasses: [{ starts_at: "2026-07-05T12:00:00" }],
    });
    expect(insights.map((i) => i.title)).toContain(
      "Visitor and overflow demand is highest on weekends",
    );
  });

  it("identifies the most frequently released zone", () => {
    const insights = computeInsights({
      ...EMPTY,
      spaces: [
        { id: "s1", property_id: "p1", level_or_zone: "Garage A" },
        { id: "s2", property_id: "p1", level_or_zone: "Garage B" },
      ],
      availabilities: [
        { parking_space_id: "s1", starts_at: "2026-07-01T08:00:00Z" },
        { parking_space_id: "s1", starts_at: "2026-07-02T08:00:00Z" },
        { parking_space_id: "s2", starts_at: "2026-07-03T08:00:00Z" },
      ],
    });
    expect(insights.map((i) => i.title)).toContain(
      "Spaces in Garage A are released frequently",
    );
  });
});
