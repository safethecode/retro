import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const appRoot = join(import.meta.dirname, "..", "..");
const repositoryRoot = join(appRoot, "..", "..");
const syncScript = join(repositoryRoot, ".github/scripts/retro-sync.mjs");
const temporaryDirectories: string[] = [];

function temporaryDirectory(): string {
  const path = mkdtempSync(join(tmpdir(), "retro-sync-"));
  temporaryDirectories.push(path);
  return path;
}

function run(cwd: string, command: string, arguments_: string[]) {
  return spawnSync(command, arguments_, {
    cwd,
    encoding: "utf8",
  });
}

function git(cwd: string, ...arguments_: string[]): string {
  const result = run(cwd, "git", arguments_);
  expect(result.status, result.stderr).toBe(0);
  return result.stdout.trim();
}

function initializeRepository(path: string): void {
  mkdirSync(path, { recursive: true });
  git(path, "init", "--initial-branch=main");
  git(path, "config", "user.name", "Retro Sync Test");
  git(path, "config", "user.email", "retro-sync@example.com");
}

function writeRepositoryFile(repository: string, path: string, contents: string): void {
  const absolutePath = join(repository, path);
  mkdirSync(dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, contents);
}

function commitAll(repository: string, message: string): string {
  git(repository, "add", ".");
  git(repository, "commit", "--message", message);
  return git(repository, "rev-parse", "HEAD");
}

function createUpstream(root: string) {
  const repository = join(root, "upstream");
  initializeRepository(repository);
  writeRepositoryFile(repository, "app.txt", "base\n");
  const baseline = commitAll(repository, "baseline");
  writeRepositoryFile(repository, "app.txt", "upstream update\n");
  const latest = commitAll(repository, "upstream update");
  return { baseline, latest, repository };
}

function createDerivedRepository(root: string): string {
  const repository = join(root, "derived");
  initializeRepository(repository);
  writeRepositoryFile(repository, "app.txt", "base\n");
  commitAll(repository, "generated from retro");
  writeRepositoryFile(repository, "project.txt", "project-specific work\n");
  commitAll(repository, "project work");
  return repository;
}

afterEach(() => {
  for (const path of temporaryDirectories.splice(0)) {
    rmSync(path, { force: true, recursive: true });
  }
});

describe("retro sync", () => {
  it("connects a generated repository to the matching upstream snapshot and merges updates", () => {
    const root = temporaryDirectory();
    const upstream = createUpstream(root);
    const derived = createDerivedRepository(root);

    const result = run(derived, process.execPath, [syncScript, "--upstream", upstream.repository]);

    expect(result.status, result.stderr).toBe(0);
    expect(readFileSync(join(derived, "app.txt"), "utf8")).toBe("upstream update\n");
    expect(readFileSync(join(derived, "project.txt"), "utf8")).toBe("project-specific work\n");
    expect(git(derived, "branch", "--show-current")).toBe(
      `chore/retro-sync-${upstream.latest.slice(0, 12)}`,
    );
    expect(
      run(derived, "git", ["merge-base", "--is-ancestor", upstream.latest, "HEAD"]).status,
    ).toBe(0);
    expect(git(derived, "remote", "get-url", "retro")).toBe(upstream.repository);
    expect(git(derived, "remote", "get-url", "--push", "retro")).toBe("DISABLED");
  });

  it("preserves an independently created project tag with the same name", () => {
    const root = temporaryDirectory();
    const upstream = createUpstream(root);
    const derived = createDerivedRepository(root);
    git(upstream.repository, "tag", "v1.0.0", upstream.baseline);
    git(derived, "tag", "v1.0.0", "HEAD");
    const projectTag = git(derived, "rev-parse", "v1.0.0");

    const result = run(derived, process.execPath, [syncScript, "--upstream", upstream.repository]);

    expect(result.status, result.stderr).toBe(0);
    expect(git(derived, "rev-parse", "v1.0.0")).toBe(projectTag);
  });

  it("leaves merge conflicts on the sync branch for local resolution", () => {
    const root = temporaryDirectory();
    const upstream = createUpstream(root);
    const derived = createDerivedRepository(root);
    writeRepositoryFile(derived, "app.txt", "project update\n");
    const projectHead = commitAll(derived, "customize app");

    const result = run(derived, process.execPath, [syncScript, "--upstream", upstream.repository]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Resolve the conflicts on the sync branch");
    expect(git(derived, "branch", "--show-current")).toBe(
      `chore/retro-sync-${upstream.latest.slice(0, 12)}`,
    );
    expect(git(derived, "rev-parse", "main")).toBe(projectHead);
    expect(run(derived, "git", ["rev-parse", "--verify", "MERGE_HEAD"]).status).toBe(0);
    expect(git(derived, "status", "--porcelain")).toContain("UU app.txt");
  });

  it("reports when Git cannot be started", () => {
    const root = temporaryDirectory();
    const derived = createDerivedRepository(root);

    const result = spawnSync(process.execPath, [syncScript], {
      cwd: derived,
      encoding: "utf8",
      env: { ...process.env, PATH: "" },
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("spawnSync git ENOENT");
  });
});
