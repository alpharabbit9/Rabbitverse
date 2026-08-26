import { describe, expect, it } from "vitest";
import {
  DEFAULT_TARGETS,
  type TargetInput,
  type Targets,
  attentionStatuses,
  coerceTarget,
  computeTargetStatuses,
  parseTargets,
  projectTargetStatus,
  sectionStatuses,
  worstLevel,
} from "./targets";
import type { Expense, JournalEntry, Project, WorkoutLog } from "./types";

// 2026-08-26 is a Wednesday → weekdayMon0 = 2, week starts Mon 2026-08-24,
// 5 days still available this week (Wed…Sun), month ends 2026-08-31.
const TODAY = "2026-08-26";

const expense = (date: string, amount: number): Expense => ({ id: `${date}-${amount}`, date, amount, categoryId: "c" });
const workout = (date: string, done = true): WorkoutLog => ({ date, done, planLabel: "Legs" });
const journal = (date: string): JournalEntry => ({ id: date, date, mood: 4, body: "" });
const project = (over: Partial<Project> = {}): Project => ({
  id: "p1",
  name: "Book",
  targetValue: 100,
  targetUnit: "%",
  current: 50,
  status: "ongoing",
  startDate: "2026-08-01",
  targetDate: "2026-08-31",
  ...over,
});

const OFF: Targets = { monthlyExpenseCap: null, weeklyExpenseCap: null, weeklyWorkouts: null, weeklyCheckIns: null };

function input(over: Partial<TargetInput> = {}): TargetInput {
  return {
    today: TODAY,
    targets: OFF,
    expenses: [],
    workoutLogs: [],
    journal: [],
    projects: [],
    ...over,
  };
}

const byId = (d: TargetInput, id: string) => computeTargetStatuses(d).find((s) => s.id === id);

describe("parseTargets / coerceTarget", () => {
  it("falls back to defaults when nothing is stored", () => {
    expect(parseTargets(undefined)).toEqual(DEFAULT_TARGETS);
    expect(parseTargets(null)).toEqual(DEFAULT_TARGETS);
    expect(parseTargets({})).toEqual(DEFAULT_TARGETS);
  });

  it("treats an explicit null as 'target switched off', not 'unset'", () => {
    expect(parseTargets({ weeklyWorkouts: null }).weeklyWorkouts).toBeNull();
    // …while the untouched keys keep their defaults
    expect(parseTargets({ weeklyWorkouts: null }).monthlyExpenseCap).toBe(DEFAULT_TARGETS.monthlyExpenseCap);
  });

  it("clamps out-of-range values and rejects junk", () => {
    expect(coerceTarget("weeklyWorkouts", 99)).toBe(14);
    expect(coerceTarget("weeklyWorkouts", 0)).toBe(1);
    expect(coerceTarget("monthlyExpenseCap", "25000")).toBe(25000);
    expect(coerceTarget("monthlyExpenseCap", 12.6)).toBe(100); // rounds, then clamps up to min
    expect(coerceTarget("weeklyCheckIns", "abc")).toBeNull();
    expect(coerceTarget("weeklyCheckIns", "")).toBeNull();
  });

  it("round-trips a fully-specified object", () => {
    const stored: Targets = { monthlyExpenseCap: 15000, weeklyExpenseCap: null, weeklyWorkouts: 3, weeklyCheckIns: 2 };
    expect(parseTargets(stored)).toEqual(stored);
  });
});

describe("expense caps", () => {
  const targets: Targets = { ...OFF, monthlyExpenseCap: 20000 };

  it("is ok well under the cap", () => {
    const s = byId(input({ targets, expenses: [expense("2026-08-10", 5000)] }), "expenses-month");
    expect(s?.level).toBe("ok");
    expect(s?.detail).toContain("৳15,000 left");
  });

  it("warns from 80% of the cap", () => {
    expect(byId(input({ targets, expenses: [expense("2026-08-10", 15999)] }), "expenses-month")?.level).toBe("ok");
    expect(byId(input({ targets, expenses: [expense("2026-08-10", 16000)] }), "expenses-month")?.level).toBe("warn");
  });

  it("goes over only above the cap, and reports the overshoot", () => {
    expect(byId(input({ targets, expenses: [expense("2026-08-10", 20000)] }), "expenses-month")?.level).toBe("warn");
    const over = byId(input({ targets, expenses: [expense("2026-08-10", 21400)] }), "expenses-month");
    expect(over?.level).toBe("over");
    expect(over?.detail).toContain("৳1,400 over");
    expect(over?.progress).toBeCloseTo(1.07);
  });

  it("counts only the current Dhaka month", () => {
    const s = byId(
      input({
        targets,
        expenses: [expense("2026-07-31", 19000), expense("2026-09-01", 19000), expense("2026-08-05", 1000)],
      }),
      "expenses-month",
    );
    expect(s?.level).toBe("ok");
    expect(s?.detail).toContain("৳1,000 of ৳20,000");
  });

  it("counts only the Mon-start week for the weekly cap", () => {
    // Sunday the 23rd belongs to the previous week and must not count.
    const s = byId(
      input({
        targets: { ...OFF, weeklyExpenseCap: 6000 },
        expenses: [expense("2026-08-23", 9000), expense("2026-08-24", 500), expense(TODAY, 300)],
      }),
      "expenses-week",
    );
    expect(s?.detail).toContain("৳800 of ৳6,000");
    expect(s?.level).toBe("ok");
  });

  it("produces no status at all when every target is switched off", () => {
    expect(computeTargetStatuses(input({ expenses: [expense(TODAY, 999999)] }))).toHaveLength(0);
  });
});

describe("weekly pace (workouts / check-ins)", () => {
  it("is ok when the target is already met", () => {
    const logs = ["2026-08-24", "2026-08-25", "2026-08-26"].map((d) => workout(d));
    const s = byId(input({ targets: { ...OFF, weeklyWorkouts: 3 }, workoutLogs: logs }), "workout-week");
    expect(s?.level).toBe("ok");
    expect(s?.label).toBe("Weekly workouts target hit");
  });

  it("is ok mid-week while there is still slack", () => {
    // 3 needed against 5 days left → 2 days of slack.
    const s = byId(input({ targets: { ...OFF, weeklyWorkouts: 3 }, workoutLogs: [] }), "workout-week");
    expect(s?.level).toBe("ok");
  });

  it("warns once every remaining day has to count", () => {
    const s = byId(input({ targets: { ...OFF, weeklyWorkouts: 4 }, workoutLogs: [] }), "workout-week");
    expect(s?.level).toBe("warn"); // 4 needed, 5 days left
    expect(s?.label).toBe("4 workouts to go");
  });

  it("goes over once the target can no longer fit in the days left", () => {
    const s = byId(input({ targets: { ...OFF, weeklyWorkouts: 6 }, workoutLogs: [] }), "workout-week");
    expect(s?.level).toBe("over"); // 6 needed, only 5 days left
    expect(s?.detail).toContain("only 5 days left");
  });

  it("ignores rest days and last week's sessions", () => {
    const logs = [workout("2026-08-23"), workout(TODAY, false), workout("2026-08-24")];
    const s = byId(input({ targets: { ...OFF, weeklyWorkouts: 4 }, workoutLogs: logs }), "workout-week");
    expect(s?.detail).toContain("1 of 4 this week");
  });

  it("counts check-ins one per day, not one per entry", () => {
    const s = byId(
      input({ targets: { ...OFF, weeklyCheckIns: 3 }, journal: [journal("2026-08-24"), journal("2026-08-24")] }),
      "mental-week",
    );
    expect(s?.detail).toContain("1 of 3 this week");
    expect(s?.level).toBe("ok"); // 2 needed, 5 days left
  });
});

describe("projects", () => {
  it("flags a project past its finish date as overdue", () => {
    const s = byId(input({ projects: [project({ targetDate: "2026-08-20" })] }), "project-p1");
    expect(s?.level).toBe("over");
    expect(s?.label).toContain("overdue");
    expect(s?.detail).toContain("6 days ago");
  });

  it("never flags a completed project", () => {
    expect(
      computeTargetStatuses(input({ projects: [project({ targetDate: "2026-08-01", status: "completed" })] })),
    ).toHaveLength(0);
  });

  it("ignores projects with no finish date", () => {
    expect(computeTargetStatuses(input({ projects: [project({ targetDate: undefined })] }))).toHaveLength(0);
  });

  it("warns when progress lags the clock by more than the slack", () => {
    // Aug 1 → Aug 31 is 30 days; today is day 25 → 83% of the time gone.
    const behind = byId(input({ projects: [project({ current: 40 })] }), "project-p1");
    expect(behind?.level).toBe("warn");
    expect(behind?.detail).toContain("83% of the time gone");

    const onPace = byId(input({ projects: [project({ current: 70 })] }), "project-p1");
    expect(onPace?.level).toBe("ok");
  });

  it("gives each project its own status", () => {
    const list = computeTargetStatuses(
      input({ projects: [project({ id: "a" }), project({ id: "b", targetDate: "2026-08-01" })] }),
    );
    expect(list.map((s) => s.id)).toEqual(["project-a", "project-b"]);
  });
});

describe("selectors", () => {
  const list = computeTargetStatuses(
    input({
      targets: DEFAULT_TARGETS,
      expenses: [expense("2026-08-10", 25000)], // over the monthly cap
      projects: [project({ current: 40 })], // behind pace
    }),
  );

  it("keeps only what needs attention, worst first", () => {
    const att = attentionStatuses(list);
    expect(att[0].level).toBe("over");
    expect(att.every((s) => s.level !== "ok")).toBe(true);
  });

  it("filters by section", () => {
    expect(sectionStatuses(list, "projects").map((s) => s.id)).toEqual(["project-p1"]);
    expect(sectionStatuses(list, "expenses").every((s) => s.section === "expenses")).toBe(true);
  });

  it("reports the worst level present", () => {
    expect(worstLevel(list)).toBe("over");
    expect(worstLevel([])).toBe("ok");
    expect(worstLevel(list.filter((s) => s.level === "ok"))).toBe("ok");
  });
});

describe("project progress source", () => {
  const dated = (over: Partial<Project> = {}): Project => ({
    id: "p1",
    name: "Book",
    targetValue: 100,
    targetUnit: "%",
    current: 62,
    status: "ongoing",
    startDate: "2026-08-01",
    targetDate: "2026-08-20",
    ...over,
  });

  it("uses the checklist when the project has tasks, matching the ring the UI draws", () => {
    const tasks = [
      { id: "1", title: "a", done: true },
      { id: "2", title: "b", done: true },
      { id: "3", title: "c", done: true },
      { id: "4", title: "d", done: false },
      { id: "5", title: "e", done: false },
    ];
    expect(projectTargetStatus(dated({ tasks }), TODAY)?.detail).toContain("60% done");
  });

  it("falls back to current / targetValue when there is no checklist", () => {
    expect(projectTargetStatus(dated(), TODAY)?.detail).toContain("62% done");
    expect(projectTargetStatus(dated({ tasks: [] }), TODAY)?.detail).toContain("62% done");
  });
});
