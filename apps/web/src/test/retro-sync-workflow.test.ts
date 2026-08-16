import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

type WorkflowStep = {
  env?: Record<string, string>;
  id?: string;
  if?: string;
  name?: string;
  run?: string;
  uses?: string;
  with?: Record<string, unknown>;
};

type Workflow = {
  concurrency?: {
    "cancel-in-progress"?: boolean;
    group?: string;
  };
  jobs?: Record<
    string,
    {
      if?: string;
      permissions?: Record<string, string>;
      steps?: WorkflowStep[];
    }
  >;
  on?: {
    schedule?: Array<{ cron?: string }>;
    workflow_dispatch?: Record<string, unknown> | null;
  };
  permissions?: Record<string, string>;
};

const appRoot = join(import.meta.dirname, "..", "..");
const repositoryRoot = join(appRoot, "..", "..");
const workflowPath = join(repositoryRoot, ".github/workflows/retro-sync.yml");

function readWorkflow(path: string): Workflow {
  return parse(readFileSync(join(repositoryRoot, path), "utf8")) as Workflow;
}

describe("retro sync workflow", () => {
  it("verifies upstream changes without credentials before opening a weekly pull request", () => {
    expect(existsSync(workflowPath)).toBe(true);
    if (!existsSync(workflowPath)) {
      return;
    }

    const workflow = readWorkflow(".github/workflows/retro-sync.yml");
    const job = workflow.jobs?.sync;
    const steps = job?.steps ?? [];
    const checkout = steps.find((step) => step.uses?.startsWith("actions/checkout@"));
    const sync = steps.find((step) => step.id === "sync");
    const synchronizedNode = steps.find((step) => step.name === "Set up synchronized Node.js");
    const synchronizedPnpm = steps.find((step) => step.name === "Set up synchronized pnpm");
    const verify = steps.find((step) => step.name === "Verify synchronized repository");
    const publish = steps.find((step) => step.name === "Push branch and open pull request");

    expect(workflow.on?.schedule).toEqual([{ cron: "0 3 * * 1" }]);
    expect(workflow.on?.workflow_dispatch).toBeDefined();
    expect(workflow.permissions).toEqual({});
    expect(workflow.concurrency).toEqual({
      "cancel-in-progress": false,
      group: "retro-sync",
    });
    expect(job?.if).toContain("github.repository != 'safethecode/retro'");
    expect(job?.permissions).toEqual({ contents: "write", "pull-requests": "write" });
    expect(checkout?.with).toMatchObject({ "fetch-depth": 0, "persist-credentials": false });
    expect(sync?.run).toContain("pnpm sync:retro");
    expect(sync?.run).toContain("updated=false");
    expect(sync?.run).toContain("updated=true");
    expect(synchronizedNode?.if).toContain("steps.sync.outputs.updated == 'true'");
    expect(synchronizedNode?.with?.["node-version-file"]).toBe(".node-version");
    expect(synchronizedPnpm?.if).toContain("steps.sync.outputs.updated == 'true'");
    expect(synchronizedPnpm?.with?.version).toBeUndefined();
    expect(steps.indexOf(sync ?? {})).toBeLessThan(steps.indexOf(synchronizedNode ?? {}));
    expect(steps.indexOf(synchronizedNode ?? {})).toBeLessThan(
      steps.indexOf(synchronizedPnpm ?? {}),
    );
    expect(steps.indexOf(synchronizedPnpm ?? {})).toBeLessThan(steps.indexOf(verify ?? {}));
    expect(verify?.if).toContain("steps.sync.outputs.updated == 'true'");
    expect(verify?.run).toContain("pnpm install --frozen-lockfile");
    expect(verify?.run).toContain("pnpm verify");
    expect(verify?.run).not.toContain("playwright");
    expect(verify?.env).toBeUndefined();
    expect(publish?.if).toContain("steps.sync.outputs.updated == 'true'");
    expect(publish?.env?.GH_TOKEN).toContain("github.token");
    expect(publish?.run).toContain("gh auth setup-git");
    expect(publish?.run).toContain("git ls-remote --heads origin");
    expect(publish?.run).toContain("--force-with-lease=refs/heads/$SYNC_BRANCH:$remote_sha");
    expect(publish?.run).toContain("gh pr create");

    const publishSyntax = spawnSync("bash", ["-n"], {
      encoding: "utf8",
      input: publish?.run ?? "",
    });
    expect(publishSyntax.status, publishSyntax.stderr).toBe(0);
  });

  it("keeps retro maintenance releases disabled in generated repositories", () => {
    const dependabot = readWorkflow(".github/workflows/dependabot-merge.yml");
    const release = readWorkflow(".github/workflows/release.yml");

    expect(dependabot.jobs?.merge?.if).toContain("github.repository == 'safethecode/retro'");
    expect(dependabot.jobs?.release?.if).toContain("github.repository == 'safethecode/retro'");
    expect(release.jobs?.release?.if).toContain("github.repository == 'safethecode/retro'");
  });
});
