import { describe, expect, it } from "vitest";
import {
  blueprintSchema,
  buildBlueprintPrompt,
  demoBlueprint,
  segments,
  tidy,
  toDraft,
  validateCreatePayload,
  type Blueprint,
} from "./project-blueprint";

const SAMPLE = `I want to build a habit tracking and personal growth platform that helps users manage different areas of their lives in one place.
The idea is to replace multiple disconnected apps (goals, habits, fitness, finances, etc.) with a single unified system.
It will have smart insights, AI motivation, and analytics to help users stay consistent.`;

const VALID: Blueprint = {
  name: "Life OS",
  idea: "A unified personal growth platform.",
  keyFeatures: ["Unified dashboard", "Goal and habit management"],
  problems: ["Users juggle multiple apps with no connection"],
  milestones: [{ title: "Project Setup & Planning", description: "Define the scope.", status: "planned" }],
};

// ---- schema -----------------------------------------------------------------

describe("blueprintSchema", () => {
  it("accepts a well-formed blueprint", () => {
    const result = blueprintSchema.safeParse(VALID);
    expect(result.success).toBe(true);
  });

  it("rejects an empty idea", () => {
    expect(blueprintSchema.safeParse({ ...VALID, idea: "   " }).success).toBe(false);
  });

  it("rejects an empty feature list", () => {
    expect(blueprintSchema.safeParse({ ...VALID, keyFeatures: [] }).success).toBe(false);
  });

  it("rejects an empty milestone list", () => {
    expect(blueprintSchema.safeParse({ ...VALID, milestones: [] }).success).toBe(false);
  });

  it("strips the bullet glyphs a model likes to prefix", () => {
    const parsed = blueprintSchema.parse({
      ...VALID,
      keyFeatures: ["✓ Unified dashboard", "  •  Goal & habit management"],
      problems: ["◆ Fragmented data leads to poor decisions"],
    });
    expect(parsed.keyFeatures).toEqual(["Unified dashboard", "Goal & habit management"]);
    expect(parsed.problems).toEqual(["Fragmented data leads to poor decisions"]);
  });

  it("falls back to planned for an unknown milestone status", () => {
    const parsed = blueprintSchema.parse({
      ...VALID,
      milestones: [{ title: "Ship it", description: "Deploy.", status: "shipped" }],
    });
    expect(parsed.milestones[0].status).toBe("planned");
  });

  it("tolerates a missing name and a missing milestone description", () => {
    const parsed = blueprintSchema.parse({
      idea: VALID.idea,
      keyFeatures: VALID.keyFeatures,
      problems: VALID.problems,
      milestones: [{ title: "Core Dashboard" }],
    });
    expect(parsed.name).toBe("");
    expect(parsed.milestones[0].description).toBe("");
  });
});

// ---- helpers ----------------------------------------------------------------

describe("tidy", () => {
  it("collapses whitespace", () => {
    expect(tidy("  a   b \n c ")).toBe("a b c");
  });
  it("leaves inner punctuation alone", () => {
    expect(tidy("Goal & habit management")).toBe("Goal & habit management");
  });
});

describe("segments", () => {
  it("splits on sentence ends and newlines, dropping fragments", () => {
    const out = segments("One thing. Two things!\nThree\nok");
    expect(out).toEqual(["One thing.", "Two things!", "Three"]);
  });
});

describe("buildBlueprintPrompt", () => {
  it("passes the working name through when there is one", () => {
    expect(buildBlueprintPrompt("x", { projectName: "Rabbit Verse" })).toContain("Rabbit Verse");
  });
  it("asks the model to propose one when there is not", () => {
    expect(buildBlueprintPrompt("x")).toContain("propose one");
  });
  it("truncates a description past the 5000 cap", () => {
    const prompt = buildBlueprintPrompt("a".repeat(6000));
    expect(prompt.length).toBeLessThan(5200);
  });
});

describe("toDraft", () => {
  it("gives every milestone a distinct id", () => {
    const draft = toDraft({
      ...VALID,
      milestones: [
        { title: "A", description: "", status: "planned" },
        { title: "B", description: "", status: "planned" },
      ],
    });
    expect(new Set(draft.milestones.map((m) => m.id)).size).toBe(2);
  });
});

// ---- offline fallback -------------------------------------------------------

describe("demoBlueprint", () => {
  it("produces a schema-valid blueprint from a real description", () => {
    const result = blueprintSchema.safeParse(demoBlueprint(SAMPLE));
    expect(result.success).toBe(true);
  });

  it("picks up the topics the description actually talks about", () => {
    const features = demoBlueprint(SAMPLE).keyFeatures.join(" ").toLowerCase();
    expect(features).toContain("habit");
  });

  it("opens with setup and closes with launch", () => {
    const { milestones } = demoBlueprint(SAMPLE);
    expect(milestones[0].title).toBe("Project Setup & Planning");
    expect(milestones.at(-1)?.title).toBe("Testing & Launch");
    expect(milestones.length).toBeLessThanOrEqual(8);
  });

  it("stays schema-valid on a nearly empty description", () => {
    expect(blueprintSchema.safeParse(demoBlueprint("hmm")).success).toBe(true);
  });

  it("shortens a long problem on a word boundary, not mid-word", () => {
    const long =
      "The problem is that people juggle a whole pile of disconnected apps for goals and habits and " +
      "fitness and finances, which means nobody ever gets a single honest view of how their week " +
      "actually went across every one of those areas at once.";
    const [problem] = demoBlueprint(long).problems;
    expect(problem.length).toBeLessThanOrEqual(180);
    expect(problem.endsWith("…")).toBe(true);
    // The character before the ellipsis ends a whole word from the source.
    const lastWord = problem.slice(0, -1).split(" ").at(-1)!;
    expect(long).toContain(lastWord);
  });

  it("leaves a short problem untouched", () => {
    const short = "The problem is that nothing talks to anything else.";
    expect(demoBlueprint(short).problems[0]).toBe(short);
  });

  it("keeps an explicit project name", () => {
    expect(demoBlueprint(SAMPLE, "Rabbit Verse").name).toBe("Rabbit Verse");
  });
});

// ---- create validation ------------------------------------------------------

describe("validateCreatePayload", () => {
  const full = {
    name: "Rabbit Verse",
    logoUrl: null,
    description: SAMPLE,
    idea: VALID.idea,
    keyFeatures: VALID.keyFeatures,
    problems: VALID.problems,
    milestones: [{ title: "A", description: "", status: "planned" as const }],
  };

  it("passes a complete draft", () => {
    expect(validateCreatePayload(full)).toBeNull();
  });

  it("names the missing piece", () => {
    expect(validateCreatePayload({ ...full, name: "  " })).toMatch(/name/i);
    expect(validateCreatePayload({ ...full, description: "" })).toMatch(/describe/i);
    expect(validateCreatePayload({ ...full, idea: "" })).toMatch(/blueprint/i);
    expect(validateCreatePayload({ ...full, milestones: [] })).toMatch(/milestone/i);
  });

  it("accepts a blueprint with features but no problems", () => {
    expect(validateCreatePayload({ ...full, problems: [] })).toBeNull();
  });

  it("rejects a blueprint with neither features nor problems", () => {
    expect(validateCreatePayload({ ...full, keyFeatures: [], problems: [] })).toMatch(/feature or problem/i);
  });
});
