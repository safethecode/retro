import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("AUTH_SECRET", "unit-test-only-secret-with-at-least-32-characters");
  vi.stubEnv("AUTH_URL", "https://retro.test");
  vi.stubEnv("DATABASE_URL", "postgresql://retro:local-only@127.0.0.1:5432/retro");
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://retro.test");
  vi.stubEnv("SKIP_ENV_VALIDATION", "false");
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("production environment validation", () => {
  it("keeps validation enabled when the skip flag is false", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "invalid-url");
    await expect(import("./env")).rejects.toThrow();
  });

  it("requires a production authentication secret", async () => {
    vi.stubEnv("AUTH_SECRET", undefined);
    await expect(import("./env")).rejects.toThrow();
  });

  it("does not allow skipping production validation", async () => {
    vi.stubEnv("AUTH_SECRET", "short");
    vi.stubEnv("SKIP_ENV_VALIDATION", "true");
    await expect(import("./env")).rejects.toThrow();
  });
});
