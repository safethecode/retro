import "server-only";

import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { env } from "@/config/env";
import { db } from "@/lib/db";
import * as schema from "./schema";

export const auth = betterAuth({
  appName: "Retro",
  baseURL: env.AUTH_URL,
  secret: env.AUTH_SECRET,
  trustedOrigins: [new URL(env.AUTH_URL).origin],
  database: drizzleAdapter(db, { provider: "pg", schema, transaction: true }),
  advanced: { database: { generateId: "uuid" } },
  emailAndPassword: { enabled: true, minPasswordLength: 8, maxPasswordLength: 128 },
  session: { expiresIn: 60 * 60 * 24 * 7, cookieCache: { enabled: false } },
  rateLimit: {
    enabled: true,
    storage: "database",
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 60, max: 10 },
      "/sign-up/email": { window: 60, max: 10 },
    },
  },
  socialProviders:
    env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET
      ? {
          google: { clientId: env.AUTH_GOOGLE_ID, clientSecret: env.AUTH_GOOGLE_SECRET },
        }
      : {},
});
