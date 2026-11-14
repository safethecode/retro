import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

const repositoryRoot = join(import.meta.dirname, "../../../..");
const manifests = [
  "package.json",
  "apps/web/package.json",
  "packages/ui/package.json",
  "packages/utils/package.json",
];

type Manifest = { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };

describe("workspace dependency policy", () => {
  it("keeps automatic Node type updates within the selected runtime major", () => {
    const config = parse(readFileSync(join(repositoryRoot, ".github/dependabot.yml"), "utf8")) as {
      updates: Array<{ "package-ecosystem": string; ignore?: Array<Record<string, unknown>> }>;
    };
    expect(
      config.updates.find((update) => update["package-ecosystem"] === "npm")?.ignore,
    ).toContainEqual({
      "dependency-name": "@types/node",
      "update-types": ["version-update:semver-major"],
    });
  });

  it("invalidates production build caches when authentication configuration changes", () => {
    const config = JSON.parse(readFileSync(join(repositoryRoot, "turbo.json"), "utf8")) as {
      tasks: { build: { env?: string[] } };
    };
    expect(config.tasks.build.env).toEqual(
      expect.arrayContaining([
        "AUTH_SECRET",
        "AUTH_URL",
        "DATABASE_URL",
        "AUTH_GOOGLE_ID",
        "AUTH_GOOGLE_SECRET",
      ]),
    );
  });

  it("shares dependency versions through catalogs and matches Node types to the runtime", () => {
    const workspace = parse(readFileSync(join(repositoryRoot, "pnpm-workspace.yaml"), "utf8")) as {
      catalog?: Record<string, string>;
    };
    expect(workspace.catalog).toBeDefined();
    const nodeMajor = readFileSync(join(repositoryRoot, ".node-version"), "utf8")
      .trim()
      .split(".")[0];
    expect(workspace.catalog?.["@types/node"]).toMatch(new RegExp(`^\\^?${nodeMajor}\\.`));

    for (const path of manifests) {
      const manifest = JSON.parse(readFileSync(join(repositoryRoot, path), "utf8")) as Manifest;
      for (const dependencies of [manifest.dependencies, manifest.devDependencies]) {
        for (const [name, version] of Object.entries(dependencies ?? {})) {
          if (workspace.catalog?.[name]) expect(version, `${path}: ${name}`).toBe("catalog:");
        }
      }
    }
  });
});
