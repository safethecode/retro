import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";

test("keeps private dashboard content isolated between cached page renders", async ({
  browser,
  baseURL,
}) => {
  if (!baseURL) throw new Error("A test base URL is required");
  const [firstContext, secondContext] = await Promise.all([
    browser.newContext({ baseURL }),
    browser.newContext({ baseURL }),
  ]);

  try {
    for (const [index, context] of [firstContext, secondContext].entries()) {
      const response = await context.request.post("/api/auth/sign-up/email", {
        headers: { Origin: baseURL },
        data: {
          name: `Cache User ${index}`,
          email: `cache-${randomUUID()}@example.com`,
          password: "test-only-password-12345",
        },
      });
      expect(response.ok()).toBe(true);
    }
    const [firstPage, secondPage] = await Promise.all([
      firstContext.newPage(),
      secondContext.newPage(),
    ]);
    await firstPage.goto("/en/dashboard");
    await expect(firstPage.getByRole("heading", { level: 2 })).toHaveText("Hello, Cache User 0");
    await secondPage.goto("/en/dashboard");
    await expect(secondPage.getByRole("heading", { level: 2 })).toHaveText("Hello, Cache User 1");
    await firstPage.reload();
    await expect(firstPage.getByRole("heading", { level: 2 })).toHaveText("Hello, Cache User 0");
  } finally {
    await Promise.all([firstContext.close(), secondContext.close()]);
  }
});
