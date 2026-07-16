import { expect, test } from "@playwright/test";

test.describe("Home Page", () => {
	test("should display welcome message", async ({ page }) => {
		await page.goto("/");
		await expect(page.locator("h1")).toBeVisible();
	});

	test("should have language switcher", async ({ page }) => {
		await page.goto("/");
		await expect(page.getByRole("button", { name: "한국어" })).toBeVisible();
		await expect(page.getByRole("button", { name: "English" })).toBeVisible();
	});

	test("should switch language to English", async ({ page }) => {
		await page.goto("/ko");
		await page.getByRole("button", { name: "English" }).click();
		await expect(page).toHaveURL(/\/en$/);
	});
});

test.describe("Health Check API", () => {
	test("should return ok status", async ({ request }) => {
		const response = await request.get("/api/v1/health");
		expect(response.ok()).toBeTruthy();

		const data = await response.json();
		expect(data.data.status).toBe("ok");
	});
});

test.describe("Authentication boundary", () => {
	test("should keep login public and redirect a protected page", async ({ page }) => {
		await page.goto("/en/login");
		await expect(page).toHaveURL(/\/en\/login$/);

		await page.goto("/en/dashboard");
		await expect(page).toHaveURL(/\/en\/login\?callbackUrl=%2Fen%2Fdashboard$/);
	});
});
