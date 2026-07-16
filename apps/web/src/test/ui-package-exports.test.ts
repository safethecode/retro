import { Button } from "@repo/ui/button";
import { useMounted } from "@repo/ui/hooks/use-mounted";
import { cn } from "@repo/ui/utils";
import { describe, expect, it } from "vitest";

describe("@repo/ui public API", () => {
  it("exports a component, hook, and class-name utility", () => {
    expect(Button).toBeTypeOf("function");
    expect(useMounted).toBeTypeOf("function");
    expect(cn("a", "b")).toBe("a b");
  });
});
