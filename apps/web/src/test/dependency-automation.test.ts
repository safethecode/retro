import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

type DependencyGroup = {
  "applies-to"?: string;
  patterns?: string[];
  "update-types"?: string[];
};

type DependabotUpdate = {
  "package-ecosystem"?: string;
  groups?: Record<string, DependencyGroup>;
};

type DependabotConfig = {
  updates?: DependabotUpdate[];
};

type WorkflowStep = {
  run?: string;
  uses?: string;
  with?: Record<string, unknown>;
};

type WorkflowConfig = {
  concurrency?: {
    "cancel-in-progress"?: boolean;
    group?: string;
  };
  jobs?: Record<string, { if?: string; steps?: WorkflowStep[] }>;
  on?: {
    pull_request_target?: { types?: string[] };
    schedule?: Array<{ cron?: string }>;
    workflow_dispatch?: {
      inputs?: Record<string, { default?: boolean; type?: string }>;
    };
    workflow_run?: { types?: string[]; workflows?: string[] };
  };
  permissions?: Record<string, string>;
};

const appRoot = join(import.meta.dirname, "..", "..");
const repositoryRoot = join(appRoot, "..", "..");
const policyScript = join(repositoryRoot, ".github/scripts/dependabot-policy.mjs");

function readYaml<T>(path: string): T {
  return parse(readFileSync(join(repositoryRoot, path), "utf8")) as T;
}

function repositoryPath(path: string): string {
  return join(repositoryRoot, path);
}

function runPolicy(...arguments_: string[]) {
  return spawnSync(process.execPath, [policyScript, ...arguments_], {
    encoding: "utf8",
  });
}

describe("dependency automation", () => {
  it("groups patch and minor updates within each ecosystem", () => {
    const config = readYaml<DependabotConfig>(".github/dependabot.yml");
    const expectedGroup = {
      "applies-to": "version-updates",
      patterns: ["*"],
      "update-types": ["minor", "patch"],
    };

    for (const ecosystem of ["npm", "github-actions"]) {
      const update = config.updates?.find(
        (candidate) => candidate["package-ecosystem"] === ecosystem,
      );

      expect(update?.groups?.["minor-and-patch"]).toEqual(expectedGroup);
    }
  });

  it("accepts Dependabot patch and minor updates for main", () => {
    for (const updateType of ["version-update:semver-patch", "version-update:semver-minor"]) {
      const result = runPolicy("classify", "dependabot[bot]", "main", updateType, "false");

      expect(result.status).toBe(0);
      expect(result.stdout.trim()).toBe("true");
    }
  });

  it("rejects updates outside the automatic merge boundary", () => {
    const rejectedInputs = [
      ["renovate[bot]", "main", "version-update:semver-patch", "false"],
      ["dependabot[bot]", "develop", "version-update:semver-patch", "false"],
      ["dependabot[bot]", "main", "version-update:semver-major", "false"],
      ["dependabot[bot]", "main", "version-update:semver-patch", "true"],
    ];

    for (const input of rejectedInputs) {
      const result = runPolicy("classify", ...input);

      expect(result.status).toBe(0);
      expect(result.stdout.trim()).toBe("false");
    }
  });

  it("increments stable patch versions", () => {
    const versions: Array<[string, string]> = [
      ["0.3.2", "0.3.3"],
      ["1.9.9", "1.9.10"],
    ];

    for (const [currentVersion, expectedVersion] of versions) {
      const result = runPolicy("next-patch", currentVersion);

      expect(result.status).toBe(0);
      expect(result.stdout.trim()).toBe(expectedVersion);
    }
  });

  it("rejects versions outside stable three-part SemVer", () => {
    for (const version of ["1.2", "1.2.3-beta.1", "latest"]) {
      const result = runPolicy("next-patch", version);

      expect(result.status).toBe(1);
      expect(result.stdout).toBe("");
    }
  });

  it("classifies candidates without checking out untrusted pull request code", () => {
    const workflowPath = ".github/workflows/dependabot-candidate.yml";

    expect(existsSync(repositoryPath(workflowPath))).toBe(true);
    if (!existsSync(repositoryPath(workflowPath))) {
      return;
    }

    const workflow = readYaml<WorkflowConfig>(workflowPath);
    const steps = workflow.jobs?.classify?.steps ?? [];
    const checkout = steps.find((step) => step.uses?.startsWith("actions/checkout@"));
    const externalActions = steps.flatMap((step) => (step.uses ? [step.uses] : []));
    const commands = steps.flatMap((step) => (step.run ? [step.run] : [])).join("\n");

    expect(workflow.on?.pull_request_target?.types).toEqual(["opened", "reopened", "synchronize"]);
    expect(workflow.permissions).toEqual({
      contents: "read",
      issues: "write",
      "pull-requests": "write",
    });
    expect(externalActions).not.toEqual([]);
    for (const action of externalActions) {
      expect(action).toMatch(/@[a-f0-9]{40}$/);
    }
    expect(checkout?.with?.ref).toBe(`\${{ github.event.pull_request.base.sha }}`);
    expect(commands).toContain("dependabot-policy.mjs classify");
    expect(commands).toContain("dependencies:automerge");
    expect(JSON.stringify(workflow)).not.toContain("pull_request.head");
  });

  it("merges only eligible Dependabot pull requests after CI succeeds", () => {
    const workflowPath = ".github/workflows/dependabot-merge.yml";

    expect(existsSync(repositoryPath(workflowPath))).toBe(true);
    if (!existsSync(repositoryPath(workflowPath))) {
      return;
    }

    const workflow = readYaml<WorkflowConfig>(workflowPath);
    const job = workflow.jobs?.merge;
    const steps = job?.steps ?? [];
    const commands = steps.flatMap((step) => (step.run ? [step.run] : [])).join("\n");

    expect(workflow.on?.workflow_run).toEqual({
      types: ["completed"],
      workflows: ["CI"],
    });
    expect(workflow.permissions).toEqual({
      actions: "read",
      contents: "write",
      issues: "write",
      "pull-requests": "write",
    });
    expect(workflow.concurrency).toEqual({
      "cancel-in-progress": false,
      group: "dependabot-merge",
    });
    expect(job?.if).toContain("conclusion == 'success'");
    expect(job?.if).toContain("event == 'pull_request'");
    expect(steps.some((step) => step.uses?.startsWith("actions/checkout@"))).toBe(false);
    expect(commands).toContain("actions/runs/$RUN_ID/pull_requests");
    expect(commands).toContain("dependabot[bot]");
    expect(commands).toContain("dependencies:automerge");
    expect(commands).toContain("@dependabot rebase");
    expect(commands).toContain("--match-head-commit");
    expect(commands).toContain("--delete-branch");
  });

  it("publishes a verified weekly patch release with a safe dry run", () => {
    const workflowPath = ".github/workflows/release.yml";

    expect(existsSync(repositoryPath(workflowPath))).toBe(true);
    if (!existsSync(repositoryPath(workflowPath))) {
      return;
    }

    const workflow = readYaml<WorkflowConfig>(workflowPath);
    const steps = workflow.jobs?.release?.steps ?? [];
    const commands = steps.flatMap((step) => (step.run ? [step.run] : [])).join("\n");
    const externalActions = steps.flatMap((step) => (step.uses ? [step.uses] : []));

    expect(workflow.on?.schedule).toEqual([{ cron: "0 0 * * 1" }]);
    expect(workflow.on?.workflow_dispatch?.inputs?.dry_run).toEqual({
      default: true,
      type: "boolean",
    });
    expect(workflow.permissions).toEqual({ contents: "write" });
    expect(externalActions).not.toEqual([]);
    for (const action of externalActions) {
      expect(action).toMatch(/@[a-f0-9]{40}$/);
    }
    expect(commands).toContain("gh release view");
    expect(commands).toContain("pnpm install --frozen-lockfile");
    expect(commands).toContain("pnpm verify");
    expect(commands).toContain("dependabot-policy.mjs next-patch");
    expect(commands).toContain("pnpm version patch --no-git-tag-version");
    expect(commands).toContain("git push --atomic");
    expect(commands).toContain("gh release create");
    expect(commands).toContain("--generate-notes");
    expect(commands).toContain("--notes-start-tag");
    expect(commands.indexOf("pnpm verify")).toBeLessThan(
      commands.indexOf("pnpm version patch --no-git-tag-version"),
    );
  });
});
