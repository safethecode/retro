import { describe, expect, it } from "vitest";
import { safeCallbackUrl } from "./callback-url";

describe("safeCallbackUrl", () => {
  it.each([
    "https://evil.example",
    "//evil.example",
    "javascript:alert(1)",
    null,
  ])("rejects unsafe callback %s", (callbackUrl) => {
    expect(safeCallbackUrl(callbackUrl)).toBe("/dashboard");
  });

  it("preserves an internal path, query, and fragment", () => {
    expect(safeCallbackUrl("/en/dashboard?tab=profile#details")).toBe(
      "/en/dashboard?tab=profile#details",
    );
  });
});
