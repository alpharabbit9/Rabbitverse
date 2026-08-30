import { describe, expect, it } from "vitest";
import { canChangeRole, canChangeStatus, canDeleteUser, confirmationMatches } from "./guards";

const ME = "admin-1";
const THEM = "member-9";

describe("canChangeStatus", () => {
  it("refuses self-suspension — it would revoke the actor's own admin rights", () => {
    expect(canChangeStatus({ actorId: ME, targetId: ME, next: "suspended" })).toMatch(/your own account/i);
  });

  it("allows suspending somebody else", () => {
    expect(canChangeStatus({ actorId: ME, targetId: THEM, next: "suspended" })).toBeNull();
  });

  it("allows reactivating anybody, including yourself", () => {
    expect(canChangeStatus({ actorId: ME, targetId: ME, next: "active" })).toBeNull();
    expect(canChangeStatus({ actorId: ME, targetId: THEM, next: "active" })).toBeNull();
  });
});

describe("canChangeRole", () => {
  const base = { actorId: ME, targetId: THEM, adminCount: 2 };

  it("never blocks a promotion", () => {
    expect(canChangeRole({ ...base, current: "member", next: "admin" })).toBeNull();
    expect(canChangeRole({ ...base, current: "member", next: "admin", adminCount: 1 })).toBeNull();
  });

  it("refuses self-demotion", () => {
    expect(
      canChangeRole({ actorId: ME, targetId: ME, current: "admin", next: "member", adminCount: 5 }),
    ).toMatch(/your own admin role/i);
  });

  it("refuses demoting the last admin", () => {
    expect(canChangeRole({ ...base, current: "admin", next: "member", adminCount: 1 })).toMatch(/only admin/i);
  });

  it("allows the demotion once a second admin exists", () => {
    expect(canChangeRole({ ...base, current: "admin", next: "member", adminCount: 2 })).toBeNull();
  });

  it("is a no-op guard when the target was never an admin", () => {
    expect(canChangeRole({ ...base, current: "member", next: "member", adminCount: 1 })).toBeNull();
  });
});

describe("canDeleteUser", () => {
  it("refuses self-deletion", () => {
    expect(canDeleteUser({ actorId: ME, targetId: ME, targetRole: "admin", adminCount: 4 })).toMatch(
      /your own account/i,
    );
  });

  it("refuses deleting the last admin", () => {
    expect(canDeleteUser({ actorId: ME, targetId: THEM, targetRole: "admin", adminCount: 1 })).toMatch(
      /only admin/i,
    );
  });

  it("allows deleting an ordinary member even when there is one admin", () => {
    expect(canDeleteUser({ actorId: ME, targetId: THEM, targetRole: "member", adminCount: 1 })).toBeNull();
  });
});

describe("confirmationMatches", () => {
  it("ignores case and surrounding whitespace", () => {
    expect(confirmationMatches("  Rifat@Example.com ", "rifat@example.com")).toBe(true);
  });

  it("rejects an empty box, a partial address and a different one", () => {
    expect(confirmationMatches("", "rifat@example.com")).toBe(false);
    expect(confirmationMatches("   ", "rifat@example.com")).toBe(false);
    expect(confirmationMatches("rifat", "rifat@example.com")).toBe(false);
    expect(confirmationMatches("other@example.com", "rifat@example.com")).toBe(false);
  });
});
