import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const origin = "https://retro.test";
const server = setupServer();

beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_API_URL", `${origin}/api/v1`);
});
afterEach(() => {
  server.resetHandlers();
  vi.unstubAllEnvs();
});
afterAll(() => server.close());

describe("HTTP client", () => {
  it.each(["users", "/users"])("keeps the API base path for %s", async (endpoint) => {
    server.use(http.get(`${origin}/api/v1/users`, () => HttpResponse.json({ data: ["user"] })));
    const { api } = await import("./client");

    expect(await api.get(endpoint)).toEqual({ success: true, data: ["user"] });
  });

  it("preserves safe application errors", async () => {
    server.use(
      http.get(`${origin}/api/v1/users`, () =>
        HttpResponse.json(
          { error: { code: "FORBIDDEN", message: "Access denied" } },
          { status: 403 },
        ),
      ),
    );
    const { api } = await import("./client");

    expect(await api.get("users")).toEqual({
      success: false,
      status: 403,
      error: { code: "FORBIDDEN", message: "Access denied" },
    });
  });

  it("rejects successful responses without the data envelope", async () => {
    server.use(http.get(`${origin}/api/v1/users`, () => HttpResponse.json({ unexpected: true })));
    const { api } = await import("./client");

    expect(await api.get("users")).toMatchObject({
      success: false,
      error: { code: "INVALID_RESPONSE" },
    });
  });

  it("does not expose network error details", async () => {
    server.use(http.get(`${origin}/api/v1/users`, () => HttpResponse.error()));
    const { api } = await import("./client");

    expect(await api.get("users")).toEqual({
      success: false,
      status: 0,
      error: { code: "NETWORK_ERROR", message: "Unable to reach the server" },
    });
  });
});
