import { afterEach, describe, expect, it } from "vitest";
import { deepClone, deepMerge, setNestedValue } from "./object.js";

afterEach(() => Reflect.deleteProperty(Object.prototype, "retroProbe"));

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

describe("object write boundaries", () => {
  it.each(["__proto__", "constructor", "prototype"])("rejects unsafe merge key %s", (key) => {
    const input = JSON.parse(`{"${key}":{"retroProbe":true}}`) as Record<string, unknown>;

    expect(() => deepMerge({}, input)).toThrow(TypeError);
    expect(Object.hasOwn(Object.prototype, "retroProbe")).toBe(false);
  });

  it.each([
    "__proto__.retroProbe",
    "constructor.prototype.retroProbe",
    "safe.__proto__.retroProbe",
  ])("rejects unsafe path %s before changing the target", (path) => {
    const target = {};

    expect(() => setNestedValue(target, path, true)).toThrow(TypeError);
    expect(target).toEqual({});
    expect(Object.hasOwn(Object.prototype, "retroProbe")).toBe(false);
  });

  it("merges own properties without copying inherited fields", () => {
    const source = Object.setPrototypeOf({ own: "safe" }, { inherited: "exclude" });
    expect(deepMerge({}, source)).toEqual({ own: "safe" });
  });

  it("merges nested records and replaces arrays", () => {
    const target: Record<string, unknown> = {
      user: { name: "Aaron", active: true },
      roles: ["old"],
    };
    expect(deepMerge(target, { user: { name: "Changed" }, roles: ["new"] })).toEqual({
      user: { name: "Changed", active: true },
      roles: ["new"],
    });
  });

  it("creates a path through null values", () => {
    const target = { user: null };
    setNestedValue(target, "user.name", "Aaron");
    expect(target).toEqual({ user: { name: "Aaron" } });
  });
});
