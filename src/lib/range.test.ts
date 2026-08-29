import { describe, expect, it } from "vitest";
import { DEFAULT_RANGE, RANGE_DAYS, isRangeKey, rangeStart, sliceRange, sliceTail } from "./range";

const today = "2026-08-29";
const row = (date: string) => ({ date });

describe("rangeStart", () => {
  it("is inclusive of today — 7d spans today plus the six days before", () => {
    expect(rangeStart(today, "7d")).toBe("2026-08-23");
  });

  it("walks back across a month boundary", () => {
    expect(rangeStart(today, "30d")).toBe("2026-07-31");
    expect(rangeStart(today, "90d")).toBe("2026-06-01");
  });

  it("walks back across a year boundary", () => {
    expect(rangeStart(today, "1y")).toBe("2025-08-30");
  });
});

describe("sliceRange", () => {
  const rows = [row("2026-08-29"), row("2026-08-23"), row("2026-08-22"), row("2026-06-15"), row("2025-01-01")];

  it("keeps only rows inside the window, boundary included", () => {
    expect(sliceRange(rows, today, "7d").map((r) => r.date)).toEqual(["2026-08-29", "2026-08-23"]);
  });

  it("widens with the range", () => {
    expect(sliceRange(rows, today, "30d")).toHaveLength(3);
    expect(sliceRange(rows, today, "90d")).toHaveLength(4);
    expect(sliceRange(rows, today, "1y")).toHaveLength(4);
  });

  it("drops future-dated rows", () => {
    expect(sliceRange([row("2026-08-30"), row(today)], today, "30d").map((r) => r.date)).toEqual([today]);
  });

  it("preserves input order", () => {
    const asc = [row("2026-08-25"), row("2026-08-27"), row("2026-08-29")];
    expect(sliceRange(asc, today, "7d").map((r) => r.date)).toEqual(["2026-08-25", "2026-08-27", "2026-08-29"]);
  });
});

describe("sliceTail", () => {
  const series = Array.from({ length: 365 }, (_, i) => i);

  it("takes the last N points of a daily series", () => {
    expect(sliceTail(series, "7d")).toHaveLength(7);
    expect(sliceTail(series, "7d").at(-1)).toBe(364);
    expect(sliceTail(series, "90d")).toHaveLength(90);
  });

  it("returns everything when the series is shorter than the range", () => {
    expect(sliceTail([1, 2, 3], "30d")).toEqual([1, 2, 3]);
  });
});

describe("isRangeKey", () => {
  it("accepts the four keys and nothing else", () => {
    for (const k of Object.keys(RANGE_DAYS)) expect(isRangeKey(k)).toBe(true);
    expect(isRangeKey("14d")).toBe(false);
    expect(isRangeKey("")).toBe(false);
    expect(isRangeKey(null)).toBe(false);
    expect(isRangeKey(30)).toBe(false);
  });

  it("has a default that is one of them", () => {
    expect(isRangeKey(DEFAULT_RANGE)).toBe(true);
  });
});
