import { describe, expect, it } from "vitest";
import { isEditableDate } from "./edit";

describe("isEditableDate", () => {
  const today = "2026-08-28";

  it("allows today", () => {
    expect(isEditableDate(today, today)).toBe(true);
  });

  it("allows yesterday and long-past dates — editing an old row is the point", () => {
    expect(isEditableDate("2026-08-27", today)).toBe(true);
    expect(isEditableDate("2026-08-01", today)).toBe(true);
    expect(isEditableDate("2025-01-15", today)).toBe(true);
  });

  it("rejects the future", () => {
    expect(isEditableDate("2026-08-29", today)).toBe(false);
    expect(isEditableDate("2027-01-01", today)).toBe(false);
  });

  it("rejects malformed input", () => {
    expect(isEditableDate("", today)).toBe(false);
    expect(isEditableDate("2026-8-1", today)).toBe(false);
    expect(isEditableDate("yesterday", today)).toBe(false);
    expect(isEditableDate("2026/08/27", today)).toBe(false);
  });
});
