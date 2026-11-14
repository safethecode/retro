import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { z } from "zod";

test("denies anonymous access to user profiles", async ({ request }) => {
  expect((await request.get("/api/v1/users")).status()).toBe(401);
});

test("rejects oversized authentication bodies", async ({ request }) => {
  const oversized = await request.post("/api/auth/sign-in/email", {
    data: { email: "test@example.com", password: "x".repeat(64 * 1024) },
  });
  expect(oversized.status()).toBe(413);
  expect(await oversized.json()).toMatchObject({ error: { code: "PAYLOAD_TOO_LARGE" } });
});

test("registers a persistent account, protects its profile, and signs in again", async ({
  page,
  request,
}) => {
  const email = `retro-${randomUUID()}@example.com`;
  const password = "test-only-password-12345";

  await page.goto("/en/register");
  await page.getByLabel("Name", { exact: true }).fill("Retro User");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Register", exact: true }).click();
  await expect(page).toHaveURL(/\/en\/dashboard$/);
  await expect(page.getByRole("heading")).toContainText("Retro User");
  const sessionCookie = (await page.context().cookies()).find((cookie) =>
    cookie.name.endsWith("better-auth.session_token"),
  );
  expect(sessionCookie).toMatchObject({ httpOnly: true, sameSite: "Lax" });
  const crossOrigin = await page.request.post("/api/auth/sign-out", {
    headers: { Origin: "https://untrusted.invalid" },
    data: {},
  });
  expect(crossOrigin.status()).toBe(403);

  expect((await request.get("/api/v1/users")).status()).toBe(401);
  expect((await page.request.get(`/api/v1/users/${randomUUID()}`)).status()).toBe(403);
  const profile = await page.request.get("/api/v1/users");
  expect(profile.status()).toBe(200);
  expect(await profile.json()).toMatchObject({ data: { users: [{ email }] } });
  expect(profile.headers()["cache-control"]).toContain("no-store");
  const profileSchema = z.object({
    data: z.object({ users: z.tuple([z.object({ id: z.uuid() })]) }),
  });
  const userId = profileSchema.parse(await profile.json()).data.users[0].id;
  const updated = await page.request.put(`/api/v1/users/${userId}`, {
    data: { name: "Updated User" },
  });
  expect(updated.status()).toBe(200);
  await page.reload();
  await expect(page.getByRole("heading")).toContainText("Updated User");

  await page.getByRole("button", { name: "Logout" }).click();
  await expect(page).toHaveURL(/\/en$/);
  expect((await page.request.get("/api/v1/users")).status()).toBe(401);

  await page.goto("/en/login");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Login", exact: true }).click();
  await expect(page).toHaveURL(/\/en\/dashboard$/);
  await expect(page.getByRole("heading")).toContainText("Updated User");
});
