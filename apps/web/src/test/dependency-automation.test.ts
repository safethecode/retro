import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

type DependencyGroup = {
  "applies-to"?: string;
  patterns?: string[];
  "update-types"?: string[];
};

type DependabotUpdate = {
  directory?: string;
  "multi-ecosystem-group"?: string;
  "package-ecosystem"?: string;
  patterns?: string[];
  groups?: Record<string, DependencyGroup>;
  schedule?: {
    day?: string;
    interval?: string;
    time?: string;
    timezone?: string;
  };
};

type DependabotConfig = {
  "multi-ecosystem-groups"?: Record<
    string,
    {
      schedule?: {
        day?: string;
        interval?: string;
        time?: string;
        timezone?: string;
      };
    }
  >;
  updates?: DependabotUpdate[];
};

type WorkflowStep = {
  env?: Record<string, string>;
  run?: string;
  uses?: string;
  with?: Record<string, unknown>;
};

type WorkflowConfig = {
  concurrency?: {
    "cancel-in-progress"?: boolean;
    group?: string;
  };
  jobs?: Record<
    string,
    {
      if?: string;
      needs?: string;
      outputs?: Record<string, string>;
      permissions?: Record<string, string>;
      steps?: WorkflowStep[];
      uses?: string;
      with?: Record<string, unknown>;
    }
  >;
  on?: {
    schedule?: Array<{ cron?: string }>;
    workflow_dispatch?: {
      inputs?: Record<string, { default?: boolean; type?: string }>;
    };
    workflow_call?: {
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
  it("combines all npm and GitHub Actions updates into one Sunday pull request", () => {
    const config = readYaml<DependabotConfig>(".github/dependabot.yml");
    const groupName = "weekly-dependencies";

    expect(config["multi-ecosystem-groups"]?.[groupName]?.schedule).toEqual({
      day: "sunday",
      interval: "weekly",
      time: "00:00",
      timezone: "UTC",
    });

    for (const ecosystem of ["npm", "github-actions"]) {
      const update = config.updates?.find(
        (candidate) => candidate["package-ecosystem"] === ecosystem,
      );

      expect(update).toMatchObject({
        directory: "/",
        "multi-ecosystem-group": groupName,
        patterns: ["*"],
      });
      expect(update?.groups).toBeUndefined();
      expect(update?.schedule).toBeUndefined();
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

  it("sequentially merges verified Dependabot pull requests on Monday", () => {
    const workflowPath = ".github/workflows/dependabot-merge.yml";

    expect(existsSync(repositoryPath(workflowPath))).toBe(true);
    if (!existsSync(repositoryPath(workflowPath))) {
      return;
    }

    const workflow = readYaml<WorkflowConfig>(workflowPath);
    const job = workflow.jobs?.merge;
    const steps = job?.steps ?? [];
    const commands = steps.flatMap((step) => (step.run ? [step.run] : [])).join("\n");

    expect(workflow.on?.schedule).toEqual([{ cron: "0 0 * * 1" }]);
    expect(workflow.on?.workflow_dispatch?.inputs?.dry_run).toEqual({
      default: true,
      type: "boolean",
    });
    expect(workflow.on?.workflow_run).toBeUndefined();
    expect(workflow.permissions).toEqual({});
    expect(job?.permissions).toEqual({
      checks: "read",
      contents: "write",
      issues: "write",
      "pull-requests": "write",
    });
    expect(workflow.concurrency).toEqual({
      "cancel-in-progress": false,
      group: "dependabot-merge",
    });
    expect(job?.outputs?.merged_count).toContain("steps.merge.outputs.merged_count");
    expect(steps.some((step) => step.uses?.startsWith("actions/checkout@"))).toBe(false);
    expect(commands).toContain("pulls?state=open&base=main");
    expect(commands).toContain("dependabot[bot]");
    expect(commands).toContain('base_ref" != "main');
    expect(commands).toContain('draft" != "false');
    expect(commands).toContain("@dependabot rebase");
    expect(commands).toContain('name == "verify"');
    expect(commands).toContain('name == "e2e"');
    expect(commands).toContain("gh pr checks");
    expect(commands).toContain("--json name,bucket,workflow");
    expect(commands).toContain("workflow_deadline");
    expect(commands).toContain(".base.sha");
    expect(commands).toContain(".merged");
    expect(commands).toContain("--match-head-commit");
    expect(commands).toContain("--delete-branch");
    expect(commands).toContain("DRY_RUN");
    expect(commands).toContain("merged_count=$merged_count");

    const syntax = spawnSync("bash", ["-n"], {
      encoding: "utf8",
      input: commands,
    });
    expect(syntax.status).toBe(0);
    expect(syntax.stderr).toBe("");
  });

  it("rebases a stale clean pull request and counts only its confirmed merge", () => {
    const workflow = readYaml<WorkflowConfig>(".github/workflows/dependabot-merge.yml");
    const commands = (workflow.jobs?.merge?.steps ?? [])
      .flatMap((step) => (step.run ? [step.run] : []))
      .join("\n");
    const temporaryDirectory = mkdtempSync(join(tmpdir(), "dependabot-merge-"));
    const fakeGh = join(temporaryDirectory, "gh");
    const fakeState = join(temporaryDirectory, "state");
    const fakeLog = join(temporaryDirectory, "gh.log");
    const githubOutput = join(temporaryDirectory, "github-output");

    writeFileSync(
      fakeGh,
      `#!/usr/bin/env bash
set -euo pipefail
printf '%s\\n' "$*" >> "$FAKE_GH_LOG"
state="initial"
if [[ -f "$FAKE_GH_STATE" ]]; then
  state=$(<"$FAKE_GH_STATE")
fi

if [[ "$1 $2" == "api --paginate" ]]; then
  printf '1\\n2\\n'
  exit 0
fi

if [[ "$1 $2" == "api repos/example/retro/git/ref/heads/main" ]]; then
  printf 'main-sha\\n'
  exit 0
fi

if [[ "$1 $2" == "api repos/example/retro/pulls/1" ]]; then
  if [[ "$*" == *"--jq .head.sha"* ]]; then
    if [[ "$state" == "initial" ]]; then
      printf 'head-1\\n'
    else
      printf 'head-2\\n'
    fi
    exit 0
  fi

  if [[ "$state" == "initial" ]]; then
    printf '%s\\n' '{"user":{"login":"dependabot[bot]"},"base":{"ref":"main","sha":"old-main"},"draft":false,"head":{"sha":"head-1"},"mergeable_state":"clean","merged":false}'
  elif [[ "$state" == "rebased" ]]; then
    printf '%s\\n' '{"user":{"login":"dependabot[bot]"},"base":{"ref":"main","sha":"main-sha"},"draft":false,"head":{"sha":"head-2"},"mergeable_state":"clean","merged":false}'
  else
    printf '%s\\n' '{"user":{"login":"dependabot[bot]"},"base":{"ref":"main","sha":"main-sha"},"draft":false,"head":{"sha":"head-2"},"mergeable_state":"clean","merged":true,"merged_at":"2026-08-03T01:00:00Z"}'
  fi
  exit 0
fi

if [[ "$1 $2" == "api repos/example/retro/pulls/2" ]]; then
  exit 1
fi

if [[ "$1 $2" == "pr comment" ]]; then
  printf 'rebased\\n' > "$FAKE_GH_STATE"
  exit 0
fi

if [[ "$1 $2" == "pr checks" ]]; then
  printf '%s\\n' '[{"name":"verify","workflow":"CI","bucket":"pass"},{"name":"e2e","workflow":"CI","bucket":"pass"}]'
  exit 0
fi

if [[ "$1 $2" == "pr merge" ]]; then
  if [[ "$*" == *"--match-head-commit head-2"* ]]; then
    printf 'merged\\n' > "$FAKE_GH_STATE"
  fi
  exit 1
fi

exit 1
`,
    );
    chmodSync(fakeGh, 0o755);

    try {
      const result = spawnSync("bash", {
        encoding: "utf8",
        env: {
          ...process.env,
          DRY_RUN: "false",
          FAKE_GH_LOG: fakeLog,
          FAKE_GH_STATE: fakeState,
          GITHUB_OUTPUT: githubOutput,
          PATH: `${temporaryDirectory}:${process.env.PATH ?? ""}`,
          REPOSITORY: "example/retro",
        },
        input: commands,
      });

      expect(result.status, result.stderr).toBe(0);
      expect(result.stderr).toBe("");
      const ghLog = readFileSync(fakeLog, "utf8");
      expect(ghLog.indexOf("pr comment")).toBeLessThan(ghLog.indexOf("pr merge"));
      expect(ghLog).toContain("--match-head-commit head-2");
      expect(ghLog.lastIndexOf("api repos/example/retro/pulls/1")).toBeGreaterThan(
        ghLog.indexOf("pr merge"),
      );
      expect(readFileSync(githubOutput, "utf8").trim()).toBe("merged_count=1");
    } finally {
      rmSync(temporaryDirectory, { force: true, recursive: true });
    }
  });

  it("publishes a verified patch release only after a Dependabot merge", () => {
    const workflowPath = ".github/workflows/release.yml";
    const mergeWorkflow = readYaml<WorkflowConfig>(".github/workflows/dependabot-merge.yml");

    expect(existsSync(repositoryPath(workflowPath))).toBe(true);
    if (!existsSync(repositoryPath(workflowPath))) {
      return;
    }

    const workflow = readYaml<WorkflowConfig>(workflowPath);
    const steps = workflow.jobs?.release?.steps ?? [];
    const commands = steps.flatMap((step) => (step.run ? [step.run] : [])).join("\n");
    const externalActions = steps.flatMap((step) => (step.uses ? [step.uses] : []));

    expect(workflow.on?.schedule).toBeUndefined();
    expect(workflow.on?.workflow_call?.inputs?.dry_run).toEqual({
      default: false,
      type: "boolean",
    });
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

    const releaseCall = mergeWorkflow.jobs?.release;
    expect(releaseCall).toMatchObject({
      needs: "merge",
      permissions: { contents: "write" },
      uses: "./.github/workflows/release.yml",
      with: { dry_run: false },
    });
    expect(releaseCall?.if).toContain("needs.merge.outputs.merged_count != '0'");
  });
});
