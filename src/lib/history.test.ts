import { describe, expect, it } from "vitest";
import type { Expense } from "./types";
import { filterExpenses, groupByDay, inMonth, monthLabel, monthOf, shiftMonth, totalOf } from "./history";

const e = (id: string, date: string, amount: number, categoryId = "c1", note?: string): Expense => ({
  id,
  date,
  amount,
  categoryId,
  note,
});

describe("month helpers", () => {
  it("reads the month key off an ISO day", () => {
    expect(monthOf("2026-08-29")).toBe("2026-08");
    expect(inMonth("2026-08-01", "2026-08")).toBe(true);
    expect(inMonth("2026-07-31", "2026-08")).toBe(false);
  });

  it("steps months and rolls the year over", () => {
    expect(shiftMonth("2026-08", -1)).toBe("2026-07");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-08", -8)).toBe("2025-12");
  });

  it("labels a month long and short", () => {
    expect(monthLabel("2026-08")).toBe("August 2026");
    expect(monthLabel("2026-01", true)).toBe("Jan 2026");
  });
});

describe("filterExpenses", () => {
  const list = [
    e("1", "2026-08-29", 450, "food", "lunch with Sami"),
    e("2", "2026-08-29", 120, "transport", "CNG"),
    e("3", "2026-08-28", 900, "food"),
  ];

  it("passes everything through with no filter", () => {
    expect(filterExpenses(list, {})).toHaveLength(3);
  });

  it("filters by category", () => {
    expect(filterExpenses(list, { categoryId: "food" }).map((x) => x.id)).toEqual(["1", "3"]);
  });

  it("searches notes case-insensitively and ignores rows with no note", () => {
    expect(filterExpenses(list, { query: "LUNCH" }).map((x) => x.id)).toEqual(["1"]);
    expect(filterExpenses(list, { query: "  cng  " }).map((x) => x.id)).toEqual(["2"]);
  });

  it("combines both filters", () => {
    expect(filterExpenses(list, { categoryId: "food", query: "lunch" }).map((x) => x.id)).toEqual(["1"]);
    expect(filterExpenses(list, { categoryId: "transport", query: "lunch" })).toEqual([]);
  });
});

describe("groupByDay", () => {
  const list = [
    e("1", "2026-08-27", 100),
    e("2", "2026-08-29", 450),
    e("3", "2026-08-29", 900),
    e("4", "2026-08-28", 60),
    e("5", "2026-08-29", 450),
  ];

  it("groups into days, newest first", () => {
    expect(groupByDay(list).map((d) => d.date)).toEqual(["2026-08-29", "2026-08-28", "2026-08-27"]);
  });

  it("totals each day", () => {
    expect(groupByDay(list).map((d) => d.total)).toEqual([1800, 60, 100]);
  });

  it("sorts biggest spend first inside a day, keeping ties in input order", () => {
    const day = groupByDay(list)[0];
    expect(day.expenses.map((x) => x.id)).toEqual(["3", "2", "5"]);
  });

  it("does not mutate the input", () => {
    const input = [e("a", "2026-08-29", 10), e("b", "2026-08-29", 20)];
    groupByDay(input);
    expect(input.map((x) => x.id)).toEqual(["a", "b"]);
  });

  it("handles an empty list", () => {
    expect(groupByDay([])).toEqual([]);
    expect(totalOf([])).toBe(0);
  });
});
