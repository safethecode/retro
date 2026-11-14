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
    expect(workspace.catalog?.["@types/node"]).toMatch(/^\^?24\./);

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
