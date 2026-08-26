/*
  V2 Phase 7 — target status nudging the Mood Mode tone and the mascot's pose.
  The rule under test is "cap, never lift": being off-track can only hold the
  mood/mascot back, and it must never turn a good week into a bad one.
*/
import { describe, expect, it } from "vitest";
import { type LifeSignals, lifeScore, moodState } from "./life-score";
import { mascotStateFor } from "./motivation";
import { targetsForSection, DEFAULT_TARGETS } from "./targets";
import type { DayActivity } from "./types";

const signals = (over: Partial<LifeSignals> = {}): LifeSignals => ({
  productivity: 90,
  fitness: 90,
  money: 90,
  mental: 90,
  focus: 90,
  streakDays: 12,
  ...over,
});

const busyDay: DayActivity = { date: "2026-08-26", counts: { projects: 1, workout: 1, expenses: 1, mental: 1 } };
const quietDay: DayActivity = { date: "2026-08-26", counts: { projects: 0, workout: 0, expenses: 0, mental: 0 } };

describe("moodState with a target level", () => {
  const great = signals();
  const greatScore = lifeScore(great);

  it("is unchanged when every target is ok", () => {
    expect(moodState(great, greatScore)).toBe("streak");
    expect(moodState(great, greatScore, "ok")).toBe("streak");
  });

  it("steps a streak down to great on a warning", () => {
    expect(moodState(great, greatScore, "warn")).toBe("great");
  });

  it("caps at steady when something is over", () => {
    expect(moodState(great, greatScore, "over")).toBe("steady");
    // …and a merely-good week too, not just a streak
    const good = signals({ streakDays: 0 });
    expect(moodState(good, lifeScore(good))).toBe("great");
    expect(moodState(good, lifeScore(good), "over")).toBe("steady");
  });

  it("never drags a mood *below* what the score alone would give", () => {
    const weak = signals({ productivity: 20, fitness: 20, money: 20, mental: 20, focus: 20, streakDays: 0 });
    const weakScore = lifeScore(weak);
    expect(moodState(weak, weakScore)).toBe("difficult");
    // already the lowest tone — "over" must not invent something worse
    expect(moodState(weak, weakScore, "over")).toBe("difficult");

    const mid = signals({ productivity: 60, fitness: 60, money: 60, mental: 60, focus: 60, streakDays: 0 });
    expect(moodState(mid, lifeScore(mid))).toBe("steady");
    expect(moodState(mid, lifeScore(mid), "over")).toBe("steady");
  });
});

describe("mascotStateFor with a target level", () => {
  it("still sleeps on a day with nothing logged, whatever the targets say", () => {
    expect(mascotStateFor(quietDay, 99, "over")).toBe("sleeping");
    expect(mascotStateFor(undefined, 99, "ok")).toBe("sleeping");
  });

  it("holds back the celebration when something is over", () => {
    expect(mascotStateFor(busyDay, 96)).toBe("celebrating");
    expect(mascotStateFor(busyDay, 96, "warn")).toBe("celebrating");
    expect(mascotStateFor(busyDay, 96, "over")).toBe("running");
  });

  it("leaves the lower poses alone", () => {
    expect(mascotStateFor(busyDay, 85, "over")).toBe("running");
    expect(mascotStateFor(busyDay, 50, "over")).toBe("walking");
  });
});

describe("targetsForSection", () => {
  it("keeps only the targets a section's own rows can judge", () => {
    expect(targetsForSection(DEFAULT_TARGETS, "expenses")).toEqual({
      monthlyExpenseCap: DEFAULT_TARGETS.monthlyExpenseCap,
      weeklyExpenseCap: DEFAULT_TARGETS.weeklyExpenseCap,
      weeklyWorkouts: null,
      weeklyCheckIns: null,
    });
    expect(targetsForSection(DEFAULT_TARGETS, "workout").weeklyWorkouts).toBe(DEFAULT_TARGETS.weeklyWorkouts);
    expect(targetsForSection(DEFAULT_TARGETS, "workout").monthlyExpenseCap).toBeNull();
    expect(targetsForSection(DEFAULT_TARGETS, "mental").weeklyCheckIns).toBe(DEFAULT_TARGETS.weeklyCheckIns);
  });

  it("blanks every user-level target for projects (they are judged per project)", () => {
    expect(targetsForSection(DEFAULT_TARGETS, "projects")).toEqual({
      monthlyExpenseCap: null,
      weeklyExpenseCap: null,
      weeklyWorkouts: null,
      weeklyCheckIns: null,
    });
  });

  it("does not mutate the targets it is given", () => {
    const original = { ...DEFAULT_TARGETS };
    targetsForSection(DEFAULT_TARGETS, "workout");
    expect(DEFAULT_TARGETS).toEqual(original);
  });
});
