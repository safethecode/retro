import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

type Step = { uses?: string; run?: string; with?: Record<string, unknown> };
const root = join(import.meta.dirname, "../../../..");

describe("CI verification policy", () => {
  it("tests a production build using read-only credentials and pinned actions", () => {
    const workflow = parse(readFileSync(join(root, ".github/workflows/ci.yml"), "utf8")) as {
      permissions?: Record<string, string>;
      jobs: Record<string, { steps: Step[] }>;
    };
    expect(workflow.permissions).toEqual({ contents: "read" });

    for (const job of Object.values(workflow.jobs)) {
      for (const step of job.steps) {
        if (step.uses) expect(step.uses).toMatch(/@[a-f0-9]{40}$/);
        if (step.uses?.startsWith("actions/checkout@")) {
          expect(step.with?.["persist-credentials"]).toBe(false);
        }
      }
    }

    const commands = workflow.jobs.e2e?.steps.flatMap((step) => step.run ?? []) ?? [];
    expect(workflow.jobs.verify?.steps.map((step) => step.run)).toContain(
      "pnpm audit --audit-level high",
    );
    expect(commands.indexOf("pnpm build")).toBeGreaterThan(-1);
    expect(commands.indexOf("pnpm build")).toBeLessThan(
      commands.findIndex((command) => command.includes("playwright test")),
    );
  });
});
