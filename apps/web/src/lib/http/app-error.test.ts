import { describe, expect, it } from "vitest";
import { z } from "zod";
import { AppError, toErrorResponse } from "./app-error";
import { parseJson } from "./parse-json";

describe("toErrorResponse", () => {
  it("preserves the public contract of known application errors", async () => {
    const response = toErrorResponse(new AppError("USER_NOT_FOUND", 404, "User not found"));

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: {
        code: "USER_NOT_FOUND",
        message: "User not found",
      },
    });
  });

  it("returns structured validation details for Zod errors", async () => {
    const result = z.object({ email: z.email() }).safeParse({ email: "nope" });
    if (result.success) {
      throw new Error("Expected validation to fail");
    }

    const response = toErrorResponse(result.error);

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: {
        code: "VALIDATION_ERROR",
        message: "Validation failed",
        details: expect.any(Object),
      },
    });
  });

  it("never exposes unexpected error details", async () => {
    const response = toErrorResponse(new Error("database password leaked"));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: {
        code: "INTERNAL_ERROR",
        message: "Internal server error",
      },
    });
  });
});

describe("parseJson", () => {
  it("maps malformed JSON to a safe client error", async () => {
    const request = new Request("https://example.com", {
      method: "POST",
      body: "{",
    });

    await expect(parseJson(request, z.object({ name: z.string() }))).rejects.toMatchObject({
      code: "INVALID_JSON",
      status: 400,
    });
  });
});
