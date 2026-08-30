import { describe, expect, it } from "vitest";
import {
  GROQ_DAILY_LIMIT,
  claimOnce,
  groqDailyBudget,
  isRedisConfigured,
  parseLogLimit,
  plannerLimit,
  rateLimit,
  slidingWindowEstimate,
  transcribeLimit,
  utcDayKey,
  windowIndex,
  windowKey,
} from "./redis";

/*
  Phase E guardrails. Two things matter and both are tested here without a live
  Redis:

  1. The sliding-window math is pure — the weighted estimate is exactly what
     decides allow/deny, so it's tested directly across a window.
  2. The no-op contract. With no Upstash env vars (the case in CI, local dev and
     demo), every guardrail must FAIL OPEN: allow the request, claim the key,
     pass the budget. A guardrail outage can never become an outage of the AI box
     it guards. `isRedisConfigured()` is false in this suite, so these assertions
     exercise that exact path.
*/

const HOUR = 3600 * 1000;

describe("slidingWindowEstimate", () => {
  it("at the very start of a window, only the current count matters", () => {
    // elapsedFraction ≈ 0 → previous window fully counted... but at t=0 exactly,
    // (0 % windowMs)/windowMs = 0, so previous is weighted 1.0.
    const now = 0;
    expect(slidingWindowEstimate(10, 3, now, HOUR)).toBe(13);
  });

  it("fades the previous window out linearly as the current one elapses", () => {
    const windowMs = HOUR;
    const base = windowIndex(1_000_000_000, windowMs) * windowMs; // a window boundary
    // Halfway through the window: previous counts for half.
    const half = base + windowMs / 2;
    expect(slidingWindowEstimate(10, 3, half, windowMs)).toBeCloseTo(10 * 0.5 + 3, 6);
    // Three-quarters through: previous counts for a quarter.
    const threeQuarter = base + (windowMs * 3) / 4;
    expect(slidingWindowEstimate(10, 3, threeQuarter, windowMs)).toBeCloseTo(10 * 0.25 + 3, 6);
  });

  it("with no previous activity the estimate is just the current count", () => {
    expect(slidingWindowEstimate(0, 5, 123456, HOUR)).toBe(5);
  });
});

describe("key + bucket helpers", () => {
  it("windowIndex buckets by fixed window", () => {
    expect(windowIndex(0, HOUR)).toBe(0);
    expect(windowIndex(HOUR - 1, HOUR)).toBe(0);
    expect(windowIndex(HOUR, HOUR)).toBe(1);
    expect(windowIndex(HOUR * 2.5, HOUR)).toBe(2);
  });

  it("windowKey namespaces by prefix + identifier + index", () => {
    expect(windowKey("rl:parse", "user-1", 42)).toBe("rl:parse:user-1:42");
  });

  it("utcDayKey is the UTC calendar day, regardless of local zone", () => {
    // 23:30 UTC and 00:30 UTC next day are different day buckets.
    expect(utcDayKey(Date.parse("2026-08-28T23:30:00Z"))).toBe("2026-08-28");
    expect(utcDayKey(Date.parse("2026-08-29T00:30:00Z"))).toBe("2026-08-29");
  });
});

describe("no-op contract when Redis is unconfigured (fail open)", () => {
  it("this suite runs with Redis unconfigured", () => {
    // The whole point of the assertions below — guard against a stray env var
    // silently turning them into live calls.
    expect(isRedisConfigured()).toBe(false);
  });

  it("rateLimit allows and reports remaining as unknown", async () => {
    const r = await rateLimit("user-1", { limit: 20, windowSeconds: 3600, prefix: "rl:parse" });
    expect(r.allowed).toBe(true);
    expect(r.remaining).toBe(-1);
    expect(r.limit).toBe(20);
    expect(r.reset).toBe(0);
  });

  it("the named limiters carry the plan's caps", async () => {
    expect((await parseLogLimit("user-1")).limit).toBe(20);
    expect((await transcribeLimit("user-1")).limit).toBe(30);
    expect((await plannerLimit("user-1")).limit).toBe(20);
    // All still allow while unconfigured.
    expect((await parseLogLimit("user-1")).allowed).toBe(true);
    expect((await transcribeLimit("user-1")).allowed).toBe(true);
    expect((await plannerLimit("user-1")).allowed).toBe(true);
  });

  it("the planner limiter has its own bucket, distinct from parseLog", () => {
    expect(windowKey("rl:planner", "user-1", 0)).not.toBe(windowKey("rl:parse", "user-1", 0));
  });

  it("groqDailyBudget passes and surfaces the configured ceiling", async () => {
    const b = await groqDailyBudget(1);
    expect(b.ok).toBe(true);
    expect(b.used).toBe(0);
    expect(b.limit).toBe(GROQ_DAILY_LIMIT);
    expect(GROQ_DAILY_LIMIT).toBeGreaterThan(0);
  });

  it("claimOnce always grants the claim (no dedupe without Redis)", async () => {
    expect(await claimOnce("save:abc")).toBe(true);
    // Same key again still true — there is no store to remember it.
    expect(await claimOnce("save:abc")).toBe(true);
  });
});
