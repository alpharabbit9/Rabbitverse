import { describe, expect, it } from "vitest";
import { DEFAULT_TZ, addDays, greeting, hourIn, isWithinLogWindow, startOfWeek, todayIn } from "./dates";

/*
  The point of these: a user's day must roll over on *their* clock. Before V3.0
  the timezone was a module constant, so someone in London logging at 23:00 had
  their entry filed against the next day — Dhaka's midnight is five hours early.
*/

describe("todayIn", () => {
  it("defaults to Dhaka, so Rifat's behaviour is unchanged", () => {
    // 2026-08-26 20:00 UTC = 2026-08-27 02:00 in Dhaka (+6).
    const at = new Date("2026-08-26T20:00:00Z");
    expect(todayIn(undefined, at)).toBe("2026-08-27");
    expect(todayIn(DEFAULT_TZ, at)).toBe("2026-08-27");
  });

  it("gives different days to different zones at the same instant", () => {
    // 2026-08-26 20:00 UTC: already tomorrow in Dhaka, still today in New York.
    const at = new Date("2026-08-26T20:00:00Z");
    expect(todayIn("Asia/Dhaka", at)).toBe("2026-08-27");
    expect(todayIn("Europe/London", at)).toBe("2026-08-26");
    expect(todayIn("America/New_York", at)).toBe("2026-08-26");
    expect(todayIn("Pacific/Kiritimati", at)).toBe("2026-08-27");
  });

  it("rolls over exactly at the zone's own midnight", () => {
    // 18:00 UTC is 23:59-ish in Dhaka the same day...
    expect(todayIn("Asia/Dhaka", new Date("2026-03-14T17:59:00Z"))).toBe("2026-03-14");
    // ...and one minute later it is the 15th there.
    expect(todayIn("Asia/Dhaka", new Date("2026-03-14T18:00:00Z"))).toBe("2026-03-15");
    // New York is still on the 14th at that instant.
    expect(todayIn("America/New_York", new Date("2026-03-14T18:00:00Z"))).toBe("2026-03-14");
  });

  it("handles a DST transition (US spring-forward, 2026-03-08)", () => {
    // 06:59 UTC = 01:59 EST; 07:00 UTC = 03:00 EDT. Same day either side.
    expect(todayIn("America/New_York", new Date("2026-03-08T06:59:00Z"))).toBe("2026-03-08");
    expect(todayIn("America/New_York", new Date("2026-03-08T07:00:00Z"))).toBe("2026-03-08");
    expect(hourIn("America/New_York", new Date("2026-03-08T06:59:00Z"))).toBe(1);
    expect(hourIn("America/New_York", new Date("2026-03-08T07:00:00Z"))).toBe(3);
  });
});

describe("isWithinLogWindow", () => {
  const at = new Date("2026-08-26T20:00:00Z"); // 27th in Dhaka, 26th in London

  it("accepts today and yesterday in the given zone", () => {
    expect(isWithinLogWindow("2026-08-27", "Asia/Dhaka", at)).toBe(true);
    expect(isWithinLogWindow("2026-08-26", "Asia/Dhaka", at)).toBe(true);
    expect(isWithinLogWindow("2026-08-25", "Asia/Dhaka", at)).toBe(false);
    expect(isWithinLogWindow("2026-08-28", "Asia/Dhaka", at)).toBe(false);
  });

  it("shifts with the zone — the same date is in-window for one user, not another", () => {
    // The 28th is tomorrow in Dhaka but two days out in London.
    expect(isWithinLogWindow("2026-08-25", "Europe/London", at)).toBe(true);
    expect(isWithinLogWindow("2026-08-25", "Asia/Dhaka", at)).toBe(false);
  });
});

describe("greeting", () => {
  it("reads the clock where the user is", () => {
    const at = new Date("2026-08-26T20:00:00Z");
    expect(greeting("Asia/Dhaka", at).text).toBe("Good night"); // 02:00
    expect(greeting("Europe/London", at).text).toBe("Good evening"); // 21:00
    expect(greeting("America/Los_Angeles", at).text).toBe("Good afternoon"); // 13:00
  });
});

describe("pure day arithmetic stays timezone-free", () => {
  it("operates on ISO strings alone", () => {
    expect(addDays("2026-08-27", -1)).toBe("2026-08-26");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
    expect(startOfWeek("2026-08-27")).toBe("2026-08-24"); // Thursday -> Monday
  });
});
