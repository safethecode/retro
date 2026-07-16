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
  it("uses the canonical source directories", () => {
    const missing = requiredDirectories.filter(
      (directory) => !existsSync(join(sourceRoot, directory)),
    );

    expect(missing).toEqual([]);
  });

  it("keeps domain-neutral layers independent from modules", () => {
    const neutralLayers = ["components", "config", "lib"];
    const violations = neutralLayers.flatMap((layer) =>
      typescriptFiles(join(sourceRoot, layer)).flatMap((file) => {
        const source = readFileSync(file, "utf8");
        return source.includes('from "@/modules/') ? [relative(appRoot, file)] : [];
      }),
    );

    expect(violations).toEqual([]);
  });

  it("marks module server entry points as server-only", () => {
    const serverEntry = readFileSync(join(sourceRoot, "modules/auth/server/index.ts"), "utf8");

    expect(serverEntry).toMatch(/^import "server-only";/);
  });

  it("keeps server-only modules out of client components", () => {
    const violations = typescriptFiles(sourceRoot).flatMap((file) => {
      const source = readFileSync(file, "utf8");
      const isClientComponent = source.startsWith('"use client"');
      const importsServerEntry = /from\s+["']@\/modules\/[^"']+\/server["']/.test(source);

      return isClientComponent && importsServerEntry ? [relative(appRoot, file)] : [];
    });

    expect(violations).toEqual([]);
  });
});
