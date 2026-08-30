import { describe, expect, it } from "vitest";
import {
  isSignupMode,
  isUserRole,
  isUserStatus,
  SIGNUP_MODE_COPY,
  SIGNUP_MODES,
  toSignupMode,
  toUserRole,
  toUserStatus,
} from "./roles";

describe("role / status / mode predicates", () => {
  it("accepts only the two roles", () => {
    expect(isUserRole("member")).toBe(true);
    expect(isUserRole("admin")).toBe(true);
    expect(isUserRole("owner")).toBe(false);
    expect(isUserRole("Admin")).toBe(false);
    expect(isUserRole(null)).toBe(false);
    expect(isUserRole(undefined)).toBe(false);
  });

  it("accepts only the two statuses", () => {
    expect(isUserStatus("active")).toBe(true);
    expect(isUserStatus("suspended")).toBe(true);
    expect(isUserStatus("deleted")).toBe(false);
    expect(isUserStatus(1)).toBe(false);
  });

  it("accepts only the three signup modes", () => {
    expect(isSignupMode("open")).toBe(true);
    expect(isSignupMode("invite")).toBe(true);
    expect(isSignupMode("closed")).toBe(true);
    expect(isSignupMode("locked")).toBe(false);
  });
});

describe("coercion defaults", () => {
  it("falls back to the least privileged role", () => {
    expect(toUserRole("admin")).toBe("admin");
    expect(toUserRole("nonsense")).toBe("member");
    expect(toUserRole(undefined)).toBe("member");
  });

  it("falls back to the least restrictive status — an unknown value must not lock somebody out", () => {
    expect(toUserStatus("suspended")).toBe("suspended");
    expect(toUserStatus(null)).toBe("active");
  });

  it("falls back to OPEN, matching the SQL signup_mode() coalesce", () => {
    expect(toSignupMode("closed")).toBe("closed");
    expect(toSignupMode(undefined)).toBe("open");
  });
});

describe("copy tables", () => {
  it("has copy for every signup mode", () => {
    for (const mode of SIGNUP_MODES) {
      expect(SIGNUP_MODE_COPY[mode].label.length).toBeGreaterThan(0);
      expect(SIGNUP_MODE_COPY[mode].description.length).toBeGreaterThan(0);
    }
  });
});
