import { describe, expect, it } from "vitest";
import { deepClone } from "./object.js";

describe("deepClone", () => {
  it("copies nested objects and dates without sharing mutable state", () => {
    const source = { user: { name: "Aaron" }, createdAt: new Date("2026-11-15") };
    const cloned = deepClone(source);
    cloned.user.name = "Changed";

    expect(source.user.name).toBe("Aaron");
    expect(cloned.createdAt).toEqual(source.createdAt);
    expect(cloned.createdAt).not.toBe(source.createdAt);
  });
});
