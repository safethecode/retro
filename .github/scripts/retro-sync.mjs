#!/usr/bin/env node

import { spawnSync } from "node:child_process";

const DEFAULT_REMOTE_NAME = "retro";
const DEFAULT_UPSTREAM = "https://github.com/safethecode/retro.git";
const UPSTREAM_BRANCH = "main";

function runGit(arguments_, { allowFailure = false } = {}) {
  const result = spawnSync("git", arguments_, { encoding: "utf8" });
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

function isAncestor(ancestor, descendant) {
  return (
    runGit(["merge-base", "--is-ancestor", ancestor, descendant], { allowFailure: true }).status ===
    0
  );
}

function hasCommonHistory(left, right) {
  return runGit(["merge-base", left, right], { allowFailure: true }).status === 0;
}

function ensureBranchDoesNotExist(branch) {
  const result = runGit(["show-ref", "--verify", "--quiet", `refs/heads/${branch}`], {
    allowFailure: true,
  });
  if (result.status === 0) {
    throw new Error(`Sync branch already exists: ${branch}`);
  }
}

function mergeInProgress() {
  return runGit(["rev-parse", "--verify", "MERGE_HEAD"], { allowFailure: true }).status === 0;
}

function cleanUpFailedBranch(originalBranch, syncBranch) {
  runGit(["switch", originalBranch], { allowFailure: true });
  runGit(["branch", "--delete", "--force", syncBranch], { allowFailure: true });
}

function mergeUpstream({ baseline, originalBranch, syncBranch, upstreamRevision }) {
  git("switch", "--create", syncBranch);
  try {
    if (baseline) {
      git(
        "merge",
        "--allow-unrelated-histories",
        "--strategy=ours",
        "--no-edit",
        "--message",
        "chore(sync): 보일러플레이트 동기화",
        baseline,
      );
    }
    git(
      "merge",
      "--no-ff",
      "--no-edit",
      "--message",
      "chore(sync): retro 최신 변경 반영",
      upstreamRevision,
    );
  } catch (error) {
    if (mergeInProgress()) {
      const detail = error instanceof Error ? error.message : "Git merge failed";
      throw new Error(
        `${detail}\nResolve the conflicts on the sync branch, stage them, and run git commit.`,
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
  if (isAncestor(upstreamCommit, "HEAD")) {
    process.stdout.write("retro is already up to date\n");
    return;
  }

  const related = hasCommonHistory("HEAD", upstreamCommit);
  const baseline = related ? undefined : matchingSnapshot(upstreamRevision);
  if (!related && !baseline) {
    throw new Error("No matching retro snapshot exists in the current branch history");
  }

  const syncBranch = `chore/retro-sync-${upstreamCommit.slice(0, 12)}`;
  ensureBranchDoesNotExist(syncBranch);
  mergeUpstream({ baseline, originalBranch, syncBranch, upstreamRevision });
  process.stdout.write(`retro updates are ready on ${syncBranch}\n`);
}

try {
  syncRetro();
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : "Unknown retro sync error"}\n`);
  process.exitCode = 1;
}
