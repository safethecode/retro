import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
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

function integrateSyncBranch(repository: string, strategy: "merge" | "squash"): void {
  const syncBranch = git(repository, "branch", "--show-current");
  git(repository, "switch", "main");
  if (strategy === "merge") {
    git(repository, "merge", "--no-ff", "--message", "merge sync", syncBranch);
    git(repository, "branch", "--delete", syncBranch);
    return;
  }

  git(repository, "merge", "--squash", syncBranch);
  commitAll(repository, "squash sync");
  git(repository, "branch", "--delete", "--force", syncBranch);
}

afterEach(() => {
  for (const path of temporaryDirectories.splice(0)) {
    rmSync(path, { force: true, recursive: true });
  }
});

describe("retro sync", () => {
  it("applies upstream changes in one commit without importing upstream history", () => {
    const root = temporaryDirectory();
    const upstream = createUpstream(root);
    const derived = createDerivedRepository(root);
    const originalCommitCount = Number(git(derived, "rev-list", "--count", "HEAD"));

    const result = run(derived, process.execPath, [syncScript, "--upstream", upstream.repository]);

    expect(result.status, result.stderr).toBe(0);
    expect(readFileSync(join(derived, "app.txt"), "utf8")).toBe("upstream update\n");
    expect(readFileSync(join(derived, "project.txt"), "utf8")).toBe("project-specific work\n");
    expect(git(derived, "branch", "--show-current")).toBe(
      `chore/retro-sync-${upstream.latest.slice(0, 12)}`,
    );
    expect(
      run(derived, "git", ["merge-base", "--is-ancestor", upstream.latest, "HEAD"]).status,
    ).toBe(1);
    expect(Number(git(derived, "rev-list", "--count", "HEAD"))).toBe(originalCommitCount + 1);
    expect(git(derived, "log", "-1", "--format=%s")).toBe("chore(sync): 보일러플레이트 동기화");
    expect(readFileSync(join(derived, ".retro-sync"), "utf8")).toBe(`${upstream.latest}\n`);
    expect(git(derived, "remote", "get-url", "retro")).toBe(upstream.repository);
    expect(git(derived, "remote", "get-url", "--push", "retro")).toBe("DISABLED");
  });

  it.each(["merge", "squash"] as const)(
    "uses the tracked sync marker after a %s integration",
    (strategy) => {
      const root = temporaryDirectory();
      const upstream = createUpstream(root);
      const derived = createDerivedRepository(root);
      const firstResult = run(derived, process.execPath, [
        syncScript,
        "--upstream",
        upstream.repository,
      ]);
      expect(firstResult.status, firstResult.stderr).toBe(0);
      integrateSyncBranch(derived, strategy);

      writeRepositoryFile(upstream.repository, "app.txt", "second upstream update\n");
      const secondLatest = commitAll(upstream.repository, "second upstream update");
      const commitCountBeforeSecondSync = Number(git(derived, "rev-list", "--count", "HEAD"));

      const secondResult = run(derived, process.execPath, [
        syncScript,
        "--upstream",
        upstream.repository,
      ]);

      expect(secondResult.status, secondResult.stderr).toBe(0);
      expect(readFileSync(join(derived, "app.txt"), "utf8")).toBe("second upstream update\n");
      expect(Number(git(derived, "rev-list", "--count", "HEAD"))).toBe(
        commitCountBeforeSecondSync + 1,
      );
      expect(
        run(derived, "git", ["merge-base", "--is-ancestor", secondLatest, "HEAD"]).status,
      ).toBe(1);
      expect(readFileSync(join(derived, ".retro-sync"), "utf8")).toBe(`${secondLatest}\n`);
    },
  );

  it("synchronizes binary changes, renames, and deletions with external diff configured", () => {
    const root = temporaryDirectory();
    const upstreamRepository = join(root, "upstream");
    initializeRepository(upstreamRepository);
    writeRepositoryFile(upstreamRepository, "renamed.txt", "before rename\n");
    writeRepositoryFile(upstreamRepository, "deleted.txt", "remove me\n");
    const baselineBinary = randomBytes(1_200_000);
    writeFileSync(join(upstreamRepository, "binary.dat"), baselineBinary);
    commitAll(upstreamRepository, "baseline");

    const derived = join(root, "derived");
    initializeRepository(derived);
    writeRepositoryFile(derived, "renamed.txt", "before rename\n");
    writeRepositoryFile(derived, "deleted.txt", "remove me\n");
    writeFileSync(join(derived, "binary.dat"), baselineBinary);
    commitAll(derived, "generated from retro");
    git(derived, "config", "diff.external", "false");

    git(upstreamRepository, "mv", "renamed.txt", "new-name.txt");
    git(upstreamRepository, "rm", "deleted.txt");
    const updatedBinary = randomBytes(1_200_000);
    writeFileSync(join(upstreamRepository, "binary.dat"), updatedBinary);
    const latest = commitAll(upstreamRepository, "change file shapes");

    const result = run(derived, process.execPath, [syncScript, "--upstream", upstreamRepository]);

    expect(result.status, result.stderr).toBe(0);
    expect(existsSync(join(derived, "renamed.txt"))).toBe(false);
    expect(readFileSync(join(derived, "new-name.txt"), "utf8")).toBe("before rename\n");
    expect(existsSync(join(derived, "deleted.txt"))).toBe(false);
    expect(readFileSync(join(derived, "binary.dat"))).toEqual(updatedBinary);
    expect(readFileSync(join(derived, ".retro-sync"), "utf8")).toBe(`${latest}\n`);
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

  it("leaves patch conflicts on the sync branch without creating a merge parent", () => {
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
    expect(run(derived, "git", ["rev-parse", "--verify", "MERGE_HEAD"]).status).toBe(128);
    expect(git(derived, "status", "--porcelain")).toContain("UU app.txt");
    expect(git(derived, "status", "--porcelain")).toContain("A  .retro-sync");
    expect(readFileSync(join(derived, ".retro-sync"), "utf8")).toBe(`${upstream.latest}\n`);
    expect(git(derived, "rev-list", "--count", "HEAD")).toBe("3");
  });

  it("cleans the temporary branch when a commit hook rejects the sync commit", () => {
    const root = temporaryDirectory();
    const upstream = createUpstream(root);
    const derived = createDerivedRepository(root);
    const projectHead = git(derived, "rev-parse", "HEAD");
    const hookPath = join(derived, ".git", "hooks", "pre-commit");
    writeFileSync(hookPath, "#!/bin/sh\nexit 1\n");
    chmodSync(hookPath, 0o755);

    const result = run(derived, process.execPath, [syncScript, "--upstream", upstream.repository]);

    expect(result.status).toBe(1);
    expect(git(derived, "branch", "--show-current")).toBe("main");
    expect(git(derived, "rev-parse", "HEAD")).toBe(projectHead);
    expect(git(derived, "status", "--porcelain")).toBe("");
    expect(
      run(derived, "git", [
        "show-ref",
        "--verify",
        "--quiet",
        `refs/heads/chore/retro-sync-${upstream.latest.slice(0, 12)}`,
      ]).status,
    ).toBe(1);
  });

  it.each(["file", "symlink"] as const)(
    "does not overwrite an ignored project %s at the reserved state path",
    (kind) => {
      const root = temporaryDirectory();
      const upstream = createUpstream(root);
      const derived = createDerivedRepository(root);
      writeRepositoryFile(derived, ".gitignore", ".retro-sync\n");
      commitAll(derived, "ignore project state");
      const projectFile = join(derived, "project.txt");
      if (kind === "file") {
        writeRepositoryFile(derived, ".retro-sync", "project-owned\n");
      } else {
        symlinkSync("project.txt", join(derived, ".retro-sync"));
      }

      const result = run(derived, process.execPath, [
        syncScript,
        "--upstream",
        upstream.repository,
      ]);

      expect(result.status).toBe(1);
      expect(result.stderr).toContain("reserved state path");
      expect(git(derived, "branch", "--show-current")).toBe("main");
      expect(readFileSync(projectFile, "utf8")).toBe("project-specific work\n");
      if (kind === "file") {
        expect(readFileSync(join(derived, ".retro-sync"), "utf8")).toBe("project-owned\n");
      }
    },
  );

  it("rejects an upstream snapshot that uses the reserved state path", () => {
    const root = temporaryDirectory();
    const upstream = createUpstream(root);
    const derived = createDerivedRepository(root);
    writeRepositoryFile(upstream.repository, ".retro-sync", `${upstream.latest}\n`);
    commitAll(upstream.repository, "use reserved path");

    const result = run(derived, process.execPath, [syncScript, "--upstream", upstream.repository]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("reserved state path");
    expect(git(derived, "branch", "--show-current")).toBe("main");
    expect(existsSync(join(derived, ".retro-sync"))).toBe(false);
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
