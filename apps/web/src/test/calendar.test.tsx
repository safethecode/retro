import { Calendar } from "@repo/ui/calendar";
import { act, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

describe("Calendar", () => {
  it("preserves the focused day when its parent renders again", () => {
    const props = { defaultMonth: new Date(2026, 10, 1), showWeekNumber: true };
    const { rerender } = render(<Calendar mode="single" {...props} />);
    const day = screen.getByRole("button", { name: /Monday, November 2nd, 2026/ });

    act(() => day.focus());
    rerender(<Calendar mode="single" {...props} />);

    expect(day).toHaveFocus();
  });
});
