import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

const loaderUrl = pathToFileURL(join(import.meta.dirname, "../../scripts/load-env.ts")).href;

describe("database CLI environment", () => {
  it.each([
    { nodeEnv: undefined, expected: "development" },
    { nodeEnv: "production", expected: "production" },
  ])("loads $expected variables for NODE_ENV=$nodeEnv", ({ nodeEnv, expected }) => {
    const directory = mkdtempSync(join(tmpdir(), "retro-db-env-"));
    try {
      for (const mode of ["development", "production"]) {
        writeFileSync(join(directory, `.env.${mode}`), `RETRO_DB_ENV_TEST=${mode}\n`);
      }
      const childEnvironment = { ...process.env, RETRO_DB_ENV_TEST: undefined };
      Reflect.deleteProperty(childEnvironment, "NODE_ENV");
      if (nodeEnv === "production") childEnvironment.NODE_ENV = nodeEnv;
      const result = execFileSync(
        process.execPath,
        [
          "--input-type=module",
          "-e",
          `await import(${JSON.stringify(loaderUrl)}); process.stdout.write(process.env.RETRO_DB_ENV_TEST ?? "");`,
        ],
        {
          cwd: directory,
          env: childEnvironment,
          encoding: "utf8",
        },
      );
      expect(result).toBe(expected);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
