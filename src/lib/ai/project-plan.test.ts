import { describe, expect, it } from "vitest";
import {
  buildMilestonePrompt,
  buildMatchPrompt,
  demoMilestones,
  demoMatch,
  filterMatchIds,
  matchResultSchema,
  milestonesResultSchema,
  type OpenMilestone,
} from "./project-plan";

// ---- milestone generation ---------------------------------------------------

describe("milestonesResultSchema", () => {
  it("accepts a valid milestone list", () => {
    const result = milestonesResultSchema.safeParse({
      milestones: [
        { title: "Set up the repo", detail: "Init git and CI." },
        { title: "Build the API", detail: "REST endpoints." },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty milestones", () => {
    expect(milestonesResultSchema.safeParse({ milestones: [] }).success).toBe(false);
  });

  it("rejects more than 12", () => {
    const too_many = Array.from({ length: 13 }, (_, i) => ({ title: `Task ${i}`, detail: "" }));
    expect(milestonesResultSchema.safeParse({ milestones: too_many }).success).toBe(false);
  });

  it("rejects a milestone with an empty title", () => {
    expect(
      milestonesResultSchema.safeParse({ milestones: [{ title: "", detail: "x" }] }).success,
    ).toBe(false);
  });
});

describe("buildMilestonePrompt", () => {
  it("includes the project name and idea", () => {
    const prompt = buildMilestonePrompt("Build a todo app with auth", { projectName: "TodoMaster" });
    expect(prompt).toContain("TodoMaster");
    expect(prompt).toContain("Build a todo app with auth");
  });
});

describe("demoMilestones", () => {
  it("returns 4 generic milestones for a very short idea", () => {
    const result = demoMilestones("ok");
    expect(result.milestones.length).toBe(4);
    expect(result.milestones[0].title).toContain("Define");
  });

  it("splits multi-sentence ideas into milestones", () => {
    const idea = "Build the auth system. Set up the database. Create the API. Write tests. Deploy to production.";
    const result = demoMilestones(idea);
    expect(result.milestones.length).toBe(5);
    expect(result.milestones[0].title).toBe("Build the auth system");
  });

  it("caps at 8 milestones", () => {
    const idea = Array.from({ length: 12 }, (_, i) => `Step ${i} is important`).join(". ");
    const result = demoMilestones(idea);
    expect(result.milestones.length).toBeLessThanOrEqual(8);
  });

  it("truncates long lines to 80 chars", () => {
    const idea = "A".repeat(120);
    const result = demoMilestones(idea);
    expect(result.milestones[0].title.length).toBeLessThanOrEqual(80);
  });
});

// ---- milestone matching -----------------------------------------------------

const MILESTONES: OpenMilestone[] = [
  { id: "t1", title: "Set up the database schema", detail: "Tables and migrations" },
  { id: "t2", title: "Build the REST API", detail: "CRUD endpoints" },
  { id: "t3", title: "Write integration tests" },
];

describe("matchResultSchema", () => {
  it("accepts valid completed ids", () => {
    const result = matchResultSchema.safeParse({
      completed: [{ id: "t1", evidence: "database is live" }],
    });
    expect(result.success).toBe(true);
  });

  it("accepts an empty completed array", () => {
    expect(matchResultSchema.safeParse({ completed: [] }).success).toBe(true);
  });
});

describe("buildMatchPrompt", () => {
  it("includes milestone ids and the update text", () => {
    const prompt = buildMatchPrompt("Finished the database setup today", MILESTONES);
    expect(prompt).toContain('id="t1"');
    expect(prompt).toContain('id="t2"');
    expect(prompt).toContain("Finished the database setup today");
  });
});

describe("filterMatchIds", () => {
  it("keeps only ids from the valid set", () => {
    const result = filterMatchIds(
      { completed: [{ id: "t1", evidence: "x" }, { id: "FAKE", evidence: "y" }] },
      new Set(["t1", "t2", "t3"]),
    );
    expect(result.completed).toHaveLength(1);
    expect(result.completed[0].id).toBe("t1");
  });

  it("returns empty when no ids match", () => {
    const result = filterMatchIds(
      { completed: [{ id: "nope", evidence: "" }] },
      new Set(["t1"]),
    );
    expect(result.completed).toHaveLength(0);
  });
});

describe("demoMatch", () => {
  it("matches when update has significant overlap with a milestone", () => {
    const result = demoMatch("Set up the database schema and migrations", MILESTONES);
    expect(result.completed.some((m) => m.id === "t1")).toBe(true);
  });

  it("returns empty for unrelated text", () => {
    const result = demoMatch("Went for a walk and had lunch", MILESTONES);
    expect(result.completed).toHaveLength(0);
  });

  it("returns empty for blank input", () => {
    expect(demoMatch("", MILESTONES).completed).toHaveLength(0);
  });
});
