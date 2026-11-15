import { existsSync, readdirSync, readFileSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const appRoot = join(import.meta.dirname, "..", "..");
const sourceRoot = join(appRoot, "src");
const requiredDirectories = [
  "app",
  "components",
  "config",
  "i18n",
  "lib",
  "modules",
  "styles",
  "test",
];

function typescriptFiles(directory: string): string[] {
  if (!existsSync(directory)) {
    return [];
  }

  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      return typescriptFiles(path);
    }
    return [".ts", ".tsx"].includes(extname(path)) ? [path] : [];
  });
}

describe("web application boundaries", () => {
  it("keeps Proxy independent from App Router locale navigation", () => {
    const source = readFileSync(join(sourceRoot, "proxy.ts"), "utf8");
    expect(source).not.toMatch(/from ["']@\/i18n["']/);
    expect(source).toContain('from "@/i18n/routing"');
  });

  it("enables Cache Components for public content and streamed private views", async () => {
    const { default: nextConfig } = await import("../../next.config");
    expect(nextConfig.cacheComponents).toBe(true);
    expect(nextConfig.partialPrefetching).toBe(true);
  });

  it("analyzes the same Turbopack bundles used by production builds", () => {
    const manifest = JSON.parse(readFileSync(join(appRoot, "package.json"), "utf8")) as {
      scripts: Record<string, string>;
    };

    expect(manifest.scripts.analyze).toBe("next experimental-analyze");
  });

  it("generates route types before checking application types", async () => {
    const { default: nextConfig } = await import("../../next.config");
    const manifest = JSON.parse(readFileSync(join(appRoot, "package.json"), "utf8")) as {
      scripts: Record<string, string>;
    };

    expect(nextConfig.typedRoutes).toBe(true);
    expect(manifest.scripts["check-types"]).toBe("next typegen && tsc --noEmit");
  });

  it("enables React Compiler for application components", async () => {
    const { default: nextConfig } = await import("../../next.config");

    expect(nextConfig.reactCompiler).toBe(true);
  });

  it("disables Next.js agent instruction file generation", async () => {
    const { default: nextConfig } = await import("../../next.config");

    expect(nextConfig.agentRules).toBe(false);
  });

  it("uses the canonical source directories", () => {
    const missing = requiredDirectories.filter(
      (directory) => !existsSync(join(sourceRoot, directory)),
    );

    expect(missing).toEqual([]);
  });

  it("keeps domain-neutral layers independent from modules", () => {
    const neutralLayers = ["components", "config", "i18n", "lib"];
    const violations = neutralLayers.flatMap((layer) =>
      typescriptFiles(join(sourceRoot, layer)).flatMap((file) => {
        const source = readFileSync(file, "utf8");
        return source.includes('from "@/modules/') ? [relative(appRoot, file)] : [];
      }),
    );

    expect(violations).toEqual([]);
  });

  it("marks module server entry points as server-only", () => {
    const entries = [
      "modules/auth/server/index.ts",
      "modules/auth/server/auth.ts",
      "modules/auth/server/session.ts",
      "lib/db.ts",
    ];
    for (const entry of entries) {
      expect(readFileSync(join(sourceRoot, entry), "utf8"), entry).toMatch(
        /^import "server-only";/,
      );
    }
  });

  it("keeps server-only modules out of client components", () => {
    const violations = typescriptFiles(sourceRoot).flatMap((file) => {
      const source = readFileSync(file, "utf8");
      const isClientComponent = source.startsWith('"use client"');
      const importsServerEntry = /from\s+["']@\/modules\/[^"']+\/server(?:\/[^"']+)?["']/.test(
        source,
      );

      return isClientComponent && importsServerEntry ? [relative(appRoot, file)] : [];
    });

    expect(violations).toEqual([]);
  });
});
