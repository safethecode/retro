import { describe, expect, it } from "vitest";

describe("server test runtime", () => {
  it("uses Node globals without a simulated browser", () => {
    expect(typeof document).toBe("undefined");
    expect(new Response().status).toBe(200);
  });
});
