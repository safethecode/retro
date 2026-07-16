import { defineConfig, devices } from "@playwright/test";

const isCI = Boolean(process.env.CI);
const chromiumExecutablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;

export default defineConfig({
	testDir: "./e2e",
	fullyParallel: true,
	forbidOnly: isCI,
	retries: isCI ? 2 : 0,
	...(isCI ? { workers: 1 } : {}),
	reporter: "html",
	use: {
		baseURL: "http://localhost:3000",
		trace: "on-first-retry",
	},
	projects: [
		{
			name: "chromium",
			use: {
				...devices["Desktop Chrome"],
				...(chromiumExecutablePath
					? { launchOptions: { executablePath: chromiumExecutablePath } }
					: {}),
			},
		},
		{
			name: "firefox",
			use: { ...devices["Desktop Firefox"] },
		},
		{
			name: "webkit",
			use: { ...devices["Desktop Safari"] },
		},
	],
	webServer: {
		command: "pnpm dev",
		url: "http://localhost:3000",
		reuseExistingServer: !isCI,
		env: {
			AUTH_SECRET: process.env.AUTH_SECRET ?? "playwright-only-secret-not-for-production",
		},
	},
});
