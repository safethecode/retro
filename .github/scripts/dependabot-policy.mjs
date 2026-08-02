import { pathToFileURL } from "node:url";

const AUTOMERGE_UPDATE_TYPES = new Set([
  "version-update:semver-patch",
  "version-update:semver-minor",
]);

export function isAutomergeCandidate({ actor, baseRef, maintainerChanges, updateType }) {
  return (
    actor === "dependabot[bot]" &&
    baseRef === "main" &&
    AUTOMERGE_UPDATE_TYPES.has(updateType) &&
    maintainerChanges === "false"
  );
}

export function nextPatchVersion(version) {
  const match = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.exec(version);
  if (!match) {
    throw new Error(`Expected a stable SemVer version, received: ${version}`);
  }

  const [, major, minor, patch] = match;
  return `${major}.${minor}.${Number(patch) + 1}`;
}

function classify([actor, baseRef, updateType, maintainerChanges]) {
  const candidate = isAutomergeCandidate({
    actor,
    baseRef,
    maintainerChanges,
    updateType,
  });

  process.stdout.write(`${candidate}\n`);
}

function nextPatch([version]) {
  process.stdout.write(`${nextPatchVersion(version)}\n`);
}

function run([command, ...arguments_]) {
  if (command === "classify" && arguments_.length === 4) {
    classify(arguments_);
    return;
  }

  if (command === "next-patch" && arguments_.length === 1) {
    nextPatch(arguments_);
    return;
  }

  throw new Error("Unsupported dependabot policy command");
}

const executablePath = process.argv[1];
if (executablePath && import.meta.url === pathToFileURL(executablePath).href) {
  try {
    run(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : "Unknown error"}\n`);
    process.exitCode = 1;
  }
}
