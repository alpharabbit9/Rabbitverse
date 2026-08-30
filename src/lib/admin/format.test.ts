import { describe, expect, it } from "vitest";
import {
  describeCounts,
  describeDeadline,
  describeLastActive,
  pageRangeLabel,
  relativeDay,
  sortRowsBy,
  totalRows,
} from "./format";
import { EMPTY_COUNTS, type AdminCounts, type AdminUserRow } from "./types";

const counts = (over: Partial<AdminCounts> = {}): AdminCounts => ({ ...EMPTY_COUNTS, ...over });

const user = (over: Partial<AdminUserRow> = {}): AdminUserRow => ({
  id: over.id ?? "u1",
  email: over.email ?? "a@example.com",
  name: over.name === undefined ? "Ada" : over.name,
  status: over.status ?? "active",
  role: over.role ?? "member",
  createdAt: over.createdAt ?? "2026-01-01T00:00:00Z",
  lastActive: over.lastActive === undefined ? "2026-08-29" : over.lastActive,
  counts: over.counts ?? counts(),
});

describe("totalRows", () => {
  it("adds every table up", () => {
    expect(totalRows(counts({ expenses: 12, journal: 3, workouts: 5 }))).toBe(20);
  });

  it("is zero for a brand-new account", () => {
    expect(totalRows(EMPTY_COUNTS)).toBe(0);
  });
});

describe("relativeDay", () => {
  const today = "2026-08-30";

  it("names the near days", () => {
    expect(relativeDay("2026-08-30", today)).toBe("today");
    expect(relativeDay("2026-08-29", today)).toBe("yesterday");
    expect(relativeDay("2026-08-27", today)).toBe("3 days ago");
  });

  it("rounds the middle distance to weeks", () => {
    expect(relativeDay("2026-08-20", today)).toBe("last week");
    expect(relativeDay("2026-08-09", today)).toBe("3 weeks ago");
  });

  it("falls back to a date once it is old enough for weeks to stop meaning anything", () => {
    expect(relativeDay("2026-03-04", today)).toBe("Mar 4");
  });

  it("treats a future day as today rather than printing '-2 days ago'", () => {
    // Possible in practice: `last_active` is a UTC day, `today` is the admin's.
    expect(relativeDay("2026-09-01", today)).toBe("today");
  });
});

describe("describeLastActive", () => {
  it("says so plainly when they have never written anything", () => {
    expect(describeLastActive(null, "2026-08-30")).toBe("never");
  });

  it("otherwise reads like a day", () => {
    expect(describeLastActive("2026-08-29", "2026-08-30")).toBe("yesterday");
  });
});

describe("sortRowsBy", () => {
  const rows = [
    user({ id: "a", email: "c@x.com", counts: counts({ expenses: 5 }), lastActive: "2026-08-20" }),
    user({ id: "b", email: "a@x.com", counts: counts({ expenses: 30 }), lastActive: null }),
    user({ id: "c", email: "b@x.com", counts: counts({ expenses: 12 }), lastActive: "2026-08-29" }),
  ];

  it("sorts by a count column, descending by default", () => {
    expect(sortRowsBy(rows, "expenses").map((r) => r.id)).toEqual(["b", "c", "a"]);
    expect(sortRowsBy(rows, "expenses", "asc").map((r) => r.id)).toEqual(["a", "c", "b"]);
  });

  it("sorts by the total across every table", () => {
    const mixed = [
      user({ id: "x", counts: counts({ expenses: 1, journal: 1 }) }),
      user({ id: "y", counts: counts({ workouts: 9 }) }),
    ];
    expect(sortRowsBy(mixed, "total").map((r) => r.id)).toEqual(["y", "x"]);
  });

  it("sinks 'never active' to the bottom in BOTH directions", () => {
    expect(sortRowsBy(rows, "last_active", "desc").map((r) => r.id)).toEqual(["c", "a", "b"]);
    expect(sortRowsBy(rows, "last_active", "asc").map((r) => r.id)).toEqual(["a", "c", "b"]);
  });

  it("sorts roster columns too, case-insensitively", () => {
    const mixed = [user({ id: "x", email: "Zoe@x.com" }), user({ id: "y", email: "amy@x.com" })];
    expect(sortRowsBy(mixed, "email", "asc").map((r) => r.id)).toEqual(["y", "x"]);
  });

  it("does not mutate the array it was given", () => {
    const before = rows.map((r) => r.id);
    sortRowsBy(rows, "expenses");
    expect(rows.map((r) => r.id)).toEqual(before);
  });

  it("breaks ties on email so the order is stable across renders", () => {
    const tied = [
      user({ id: "x", email: "b@x.com", counts: counts({ expenses: 4 }) }),
      user({ id: "y", email: "a@x.com", counts: counts({ expenses: 4 }) }),
    ];
    expect(sortRowsBy(tied, "expenses").map((r) => r.id)).toEqual(["y", "x"]);
  });
});

describe("pageRangeLabel", () => {
  it("counts from one, not zero", () => {
    expect(pageRangeLabel(312, 0, 25)).toBe("1–25 of 312");
    expect(pageRangeLabel(312, 25, 25)).toBe("26–50 of 312");
  });

  it("says something honest when there is nothing", () => {
    expect(pageRangeLabel(0, 0, 0)).toBe("no users");
  });
});

describe("describeCounts", () => {
  it("lists only the tables that hold something, in display order", () => {
    expect(describeCounts(counts({ expenses: 142, journal: 61, projects: 3 }))).toBe(
      "142 expenses · 61 journal entries · 3 projects",
    );
  });

  it("says the singular when there is exactly one", () => {
    expect(describeCounts(counts({ journal: 1, expenses: 2 }))).toBe("2 expenses · 1 journal entry");
  });

  it("is honest about an account that has never logged anything", () => {
    expect(describeCounts(EMPTY_COUNTS)).toMatch(/never logged/i);
  });
});

describe("describeDeadline", () => {
  const today = "2026-08-30";

  it("counts forward to a day that hasn't come yet", () => {
    expect(describeDeadline("2026-08-30", today)).toBe("today");
    expect(describeDeadline("2026-08-31", today)).toBe("tomorrow");
    expect(describeDeadline("2026-09-05", today)).toBe("in 6 days");
    expect(describeDeadline("2026-09-20", today)).toBe("in 3 weeks");
  });

  it("hands a day that has already gone back to relativeDay", () => {
    expect(describeDeadline("2026-08-29", today)).toBe("yesterday");
    expect(describeDeadline("2026-03-04", today)).toBe("Mar 4");
  });
});
