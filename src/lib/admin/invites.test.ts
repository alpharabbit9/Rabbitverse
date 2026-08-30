import { describe, expect, it } from "vitest";
import {
  CODE_BYTES,
  INVITE_ALPHABET,
  describeAudience,
  expiryFromDays,
  generateInviteCode,
  inviteLink,
  inviteStatus,
  isInviteCodeShape,
  normalizeInviteCode,
  usesRemaining,
} from "./invites";

const bytes = (...values: number[]) => Uint8Array.from(values);

describe("generateInviteCode", () => {
  it("is deterministic for the bytes it is given", () => {
    const input = bytes(0, 1, 2, 3, 4, 5, 6, 7);
    expect(generateInviteCode(input)).toBe(generateInviteCode(input));
  });

  it("prints as RV- plus two groups of four", () => {
    expect(generateInviteCode(bytes(0, 0, 0, 0, 0, 0, 0, 0))).toBe("RV-2222-2222");
    expect(isInviteCodeShape(generateInviteCode(bytes(9, 40, 71, 102, 133, 164, 195, 226)))).toBe(true);
  });

  it("only ever emits alphabet characters, whatever the byte", () => {
    const code = generateInviteCode(bytes(255, 254, 200, 150, 99, 60, 31, 30));
    for (const ch of code.replace(/^RV-/, "").replace("-", "")) {
      expect(INVITE_ALPHABET).toContain(ch);
    }
  });

  it("refuses to make a code out of too little randomness", () => {
    expect(() => generateInviteCode(bytes(1, 2, 3))).toThrow(/at least 8 bytes/i);
  });

  it("ignores bytes beyond the ones it needs", () => {
    const short = bytes(5, 5, 5, 5, 5, 5, 5, 5);
    const long = bytes(5, 5, 5, 5, 5, 5, 5, 5, 99, 99);
    expect(generateInviteCode(long)).toBe(generateInviteCode(short));
    expect(CODE_BYTES).toBe(8);
  });
});

describe("normalizeInviteCode", () => {
  it("accepts every way a person might paste the same code", () => {
    const canonical = "RV-7K2M-QX4B";
    expect(normalizeInviteCode("RV-7K2M-QX4B")).toBe(canonical);
    expect(normalizeInviteCode("rv-7k2m-qx4b")).toBe(canonical);
    expect(normalizeInviteCode("  RV7K2MQX4B  ")).toBe(canonical);
    expect(normalizeInviteCode("7K2M QX4B")).toBe(canonical);
  });

  it("hands back nonsense unchanged rather than inventing a shape for it", () => {
    expect(normalizeInviteCode("  hello  ")).toBe("HELLO");
    expect(isInviteCodeShape(normalizeInviteCode("hello"))).toBe(false);
  });
});

describe("isInviteCodeShape", () => {
  it("rejects the letters the alphabet deliberately drops", () => {
    expect(isInviteCodeShape("RV-0O1I-LUAB")).toBe(false);
  });

  it("rejects a code of the wrong length", () => {
    expect(isInviteCodeShape("RV-7K2M-QX4")).toBe(false);
  });
});

describe("inviteStatus", () => {
  const now = new Date("2026-08-30T12:00:00Z");
  const base = { uses: 0, maxUses: 1, expiresAt: null as string | null, revokedAt: null as string | null };

  it("is live while it has a use left and no end date has passed", () => {
    expect(inviteStatus(base, now)).toBe("live");
    expect(inviteStatus({ ...base, expiresAt: "2026-09-13T12:00:00Z" }, now)).toBe("live");
    expect(inviteStatus({ ...base, uses: 3, maxUses: 5 }, now)).toBe("live");
  });

  it("is used once every use is spent", () => {
    expect(inviteStatus({ ...base, uses: 1, maxUses: 1 }, now)).toBe("used");
    expect(inviteStatus({ ...base, uses: 5, maxUses: 5 }, now)).toBe("used");
  });

  it("is expired the moment the deadline is reached", () => {
    expect(inviteStatus({ ...base, expiresAt: "2026-08-30T12:00:00Z" }, now)).toBe("expired");
    expect(inviteStatus({ ...base, expiresAt: "2026-08-29T12:00:00Z" }, now)).toBe("expired");
  });

  it("reads as revoked even when it also expired or ran out", () => {
    const dead = { uses: 5, maxUses: 5, expiresAt: "2020-01-01T00:00:00Z", revokedAt: "2026-08-01T00:00:00Z" };
    expect(inviteStatus(dead, now)).toBe("revoked");
  });

  it("ignores an unparseable expiry rather than calling a live invite expired", () => {
    expect(inviteStatus({ ...base, expiresAt: "not a date" }, now)).toBe("live");
  });
});

describe("usesRemaining", () => {
  it("counts down and never goes below zero", () => {
    expect(usesRemaining({ uses: 2, maxUses: 5 })).toBe(3);
    expect(usesRemaining({ uses: 9, maxUses: 5 })).toBe(0);
  });
});

describe("expiryFromDays", () => {
  const now = new Date("2026-08-30T12:00:00Z");

  it("adds whole days", () => {
    expect(expiryFromDays(14, now)).toBe("2026-09-13T12:00:00.000Z");
  });

  it("means never when asked for never", () => {
    expect(expiryFromDays(null, now)).toBeNull();
  });
});

describe("inviteLink", () => {
  it("builds a prefill link without doubling the slash", () => {
    expect(inviteLink("https://rabbit.example", "RV-7K2M-QX4B")).toBe(
      "https://rabbit.example/signup?invite=RV-7K2M-QX4B",
    );
    expect(inviteLink("https://rabbit.example/", "RV-7K2M-QX4B")).toBe(
      "https://rabbit.example/signup?invite=RV-7K2M-QX4B",
    );
  });
});

describe("describeAudience", () => {
  it("names the address when one is bound, and says so plainly when not", () => {
    expect(describeAudience({ email: "rifat@example.com" })).toBe("rifat@example.com");
    expect(describeAudience({ email: null })).toBe("anyone with the code");
  });
});
