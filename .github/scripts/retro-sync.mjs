#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import {
  closeSync,
  constants,
  existsSync,
  lstatSync,
  mkdtempSync,
  openSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const DEFAULT_REMOTE_NAME = "retro";
const DEFAULT_UPSTREAM = "https://github.com/safethecode/retro.git";
const SYNC_STATE_PATH = ".retro-sync";
const UPSTREAM_BRANCH = "main";

function runGit(arguments_, { allowFailure = false, input } = {}) {
  const result = spawnSync("git", arguments_, { encoding: "utf8", input });
  if (result.error) {
    throw result.error;
  }
  if (!allowFailure && result.status !== 0) {
    const detail = result.stderr?.trim() || result.stdout?.trim() || "Git command failed";
    throw new Error(detail);
  }
  return result;
}

function git(...arguments_) {
  return runGit(arguments_).stdout.trim();
}

function runGitToFile(arguments_, outputPath) {
  const output = openSync(outputPath, "w");
  let result;
  try {
    result = spawnSync("git", arguments_, {
      encoding: "utf8",
      stdio: ["ignore", output, "pipe"],
    });
  } finally {
    closeSync(output);
  }
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(result.stderr?.trim() || "Git command failed");
  }
}

function parseArguments(arguments_) {
  let upstream = DEFAULT_UPSTREAM;

  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    if (argument !== "--upstream") {
      throw new Error(`Unsupported argument: ${argument}`);
    }

    const value = arguments_[index + 1];
    if (!value) {
      throw new Error("--upstream requires a repository URL or path");
    }
    upstream = value;
    index += 1;
  }

  return { upstream };
}

function ensureCleanWorkingTree() {
  if (git("status", "--porcelain")) {
    throw new Error("The working tree must be clean before syncing retro");
  }
}

function currentBranch() {
  const branch = git("branch", "--show-current");
  if (!branch) {
    throw new Error("Retro sync requires a checked-out branch");
  }
  return branch;
}

function ensureRemote(upstream) {
  const existing = runGit(["remote", "get-url", DEFAULT_REMOTE_NAME], { allowFailure: true });
  if (existing.status !== 0) {
    git("remote", "add", DEFAULT_REMOTE_NAME, upstream);
  } else if (existing.stdout.trim() !== upstream) {
    throw new Error(
      `Remote ${DEFAULT_REMOTE_NAME} already points to ${existing.stdout.trim()}, expected ${upstream}`,
    );
  }

  git("remote", "set-url", "--push", DEFAULT_REMOTE_NAME, "DISABLED");
}

function commitTrees(revision) {
  const output = git("log", "--format=%H%x09%T", revision);
  if (!output) {
    return [];
  }
  return output.split("\n").map((line) => {
    const [commit, tree] = line.split("\t");
    return { commit, tree };
  });
}

function matchingSnapshot(upstreamRevision) {
  const upstreamByTree = new Map();
  for (const entry of commitTrees(upstreamRevision)) {
    if (!upstreamByTree.has(entry.tree)) {
      upstreamByTree.set(entry.tree, entry.commit);
    }
  }

  for (const entry of commitTrees("HEAD")) {
    const upstreamCommit = upstreamByTree.get(entry.tree);
    if (upstreamCommit) {
      return upstreamCommit;
    }
  }

  return undefined;
}

function recordedUpstream() {
  const result = runGit(["show", `HEAD:${SYNC_STATE_PATH}`], { allowFailure: true });
  if (result.status !== 0) {
    return undefined;
  }

  const value = result.stdout.trim();
  if (!/^[0-9a-f]{40}$/u.test(value)) {
    throw new Error(`Invalid ${SYNC_STATE_PATH} value: ${value || "empty"}`);
  }
  return value;
}

function validateStatePath(upstreamCommit) {
  const upstreamState = runGit(["cat-file", "-e", `${upstreamCommit}:${SYNC_STATE_PATH}`], {
    allowFailure: true,
  });
  if (upstreamState.status === 0) {
    throw new Error(`Upstream uses the reserved state path: ${SYNC_STATE_PATH}`);
  }
  if (!existsSync(SYNC_STATE_PATH)) {
    return;
  }

  const trackedState = runGit(["ls-files", "--error-unmatch", "--", SYNC_STATE_PATH], {
    allowFailure: true,
  });
  const state = lstatSync(SYNC_STATE_PATH);
  if (trackedState.status !== 0 || state.isSymbolicLink() || !state.isFile()) {
    throw new Error(`Project content exists at the reserved state path: ${SYNC_STATE_PATH}`);
  }
}

function writeState(upstreamCommit) {
  const descriptor = openSync(
    SYNC_STATE_PATH,
    constants.O_WRONLY | constants.O_CREAT | constants.O_TRUNC | constants.O_NOFOLLOW,
    0o600,
  );
  try {
    writeFileSync(descriptor, `${upstreamCommit}\n`);
  } finally {
    closeSync(descriptor);
  }
  git("add", "--force", "--", SYNC_STATE_PATH);
}

function isAncestor(ancestor, descendant) {
  return (
    runGit(["merge-base", "--is-ancestor", ancestor, descendant], { allowFailure: true }).status ===
    0
  );
}

function ensureBranchDoesNotExist(branch) {
  const result = runGit(["show-ref", "--verify", "--quiet", `refs/heads/${branch}`], {
    allowFailure: true,
  });
  if (result.status === 0) {
    throw new Error(`Sync branch already exists: ${branch}`);
  }
}

function hasUnmergedFiles() {
  return Boolean(git("ls-files", "--unmerged"));
}

function cleanUpFailedBranch(originalBranch, syncBranch) {
  git("reset", "--hard", "HEAD");
  git("switch", originalBranch);
  git("branch", "--delete", "--force", syncBranch);
}

function applyUpstream({ baseline, originalBranch, syncBranch, upstreamCommit }) {
  git("switch", "--create", syncBranch);
  try {
    writeState(upstreamCommit);
    const patchDirectory = mkdtempSync(join(tmpdir(), "retro-sync-patch-"));
    const patchPath = join(patchDirectory, "update.patch");
    try {
      runGitToFile(
        [
          "diff",
          "--binary",
          "--full-index",
          "--no-ext-diff",
          "--no-textconv",
          "--no-renames",
          baseline,
          upstreamCommit,
        ],
        patchPath,
      );
      if (statSync(patchPath).size === 0) {
        git("commit", "--allow-empty", "--message", "chore(sync): 보일러플레이트 동기화");
        return;
      }
      const result = runGit(["apply", "--3way", "--index", "--whitespace=nowarn", patchPath], {
        allowFailure: true,
      });
      if (result.status !== 0) {
        const detail = result.stderr?.trim() || result.stdout?.trim() || "Git patch failed";
        throw new Error(detail);
      }
    } finally {
      rmSync(patchDirectory, { force: true, recursive: true });
    }
    git("commit", "--allow-empty", "--message", "chore(sync): 보일러플레이트 동기화");
  } catch (error) {
    if (hasUnmergedFiles()) {
      const detail = error instanceof Error ? error.message : "Git patch failed";
      throw new Error(
        `${detail}\nResolve the conflicts on the sync branch, stage them, and run git commit --message "chore(sync): 보일러플레이트 동기화".`,
      );
    }
    cleanUpFailedBranch(originalBranch, syncBranch);
    throw error;
  }
}

export function syncRetro(arguments_ = process.argv.slice(2)) {
  const { upstream } = parseArguments(arguments_);
  ensureCleanWorkingTree();
  const originalBranch = currentBranch();
  ensureRemote(upstream);
  git("fetch", DEFAULT_REMOTE_NAME);

  const upstreamRevision = `${DEFAULT_REMOTE_NAME}/${UPSTREAM_BRANCH}`;
  const upstreamCommit = git("rev-parse", upstreamRevision);
  validateStatePath(upstreamCommit);
  const baseline = recordedUpstream() ?? matchingSnapshot(upstreamCommit);
  if (!baseline) {
    throw new Error("No matching retro snapshot exists in the current branch history");
  }
  if (!isAncestor(baseline, upstreamCommit)) {
    throw new Error(`Recorded retro snapshot is not available in ${upstreamRevision}: ${baseline}`);
  }
  if (baseline === upstreamCommit) {
    process.stdout.write("retro is already up to date\n");
    return;
  }

  const syncBranch = `chore/retro-sync-${upstreamCommit.slice(0, 12)}`;
  ensureBranchDoesNotExist(syncBranch);
  applyUpstream({ baseline, originalBranch, syncBranch, upstreamCommit });
  process.stdout.write(`retro updates are ready on ${syncBranch}\n`);
}

try {
  syncRetro();
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : "Unknown retro sync error"}\n`);
  process.exitCode = 1;
}
