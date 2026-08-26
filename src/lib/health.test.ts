import { describe, expect, it } from "vitest";
import { bmiBand, bmiFrom } from "./health";

describe("bmiBand", () => {
  it("classifies each band at its boundaries", () => {
    expect(bmiBand(18.4)).toBe("under");
    expect(bmiBand(18.5)).toBe("healthy");
    expect(bmiBand(24.9)).toBe("healthy");
    expect(bmiBand(25)).toBe("above");
    expect(bmiBand(29.9)).toBe("above");
    expect(bmiBand(30)).toBe("high");
  });
});

describe("bmiFrom", () => {
  it("computes and rounds to one decimal", () => {
    // 78.5kg at 178cm → 24.77…
    expect(bmiFrom(78.5, 178)?.value).toBe(24.8);
  });

  it("no longer calls every BMI healthy", () => {
    // The bug this replaces: the caption was hardcoded to "Healthy range".
    const obese = bmiFrom(105, 175);
    expect(obese?.band).toBe("high");
    expect(obese?.label).not.toBe("Healthy range");
    expect(obese?.accent).toBe("var(--accent-rose)");
  });

  it("labels a genuinely healthy reading", () => {
    const ok = bmiFrom(70, 178);
    expect(ok?.band).toBe("healthy");
    expect(ok?.label).toBe("Healthy range");
    expect(ok?.accent).toBe("var(--accent-mint)");
  });

  it("flags underweight", () => {
    expect(bmiFrom(50, 178)?.band).toBe("under");
  });

  it("returns null without both measurements", () => {
    expect(bmiFrom(undefined, 178)).toBeNull();
    expect(bmiFrom(78, null)).toBeNull();
    expect(bmiFrom(78, 0)).toBeNull();
    expect(bmiFrom(0, 178)).toBeNull();
  });
});
