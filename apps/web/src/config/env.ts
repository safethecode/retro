import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

const isProduction = process.env.NODE_ENV === "production";
const secretSchema = z.string().min(32);
const databaseUrlSchema = z
  .url()
  .refine((value) => /^postgres(?:ql)?:\/\//.test(value), "Expected a PostgreSQL URL");

export const env = createEnv({
  server: {
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    AUTH_SECRET: isProduction
      ? secretSchema
      : secretSchema.default("development-only-secret-change-before-deploy"),
    AUTH_URL: isProduction ? z.url() : z.url().default("http://localhost:3000"),
    DATABASE_URL: isProduction
      ? databaseUrlSchema
      : databaseUrlSchema.default("postgresql://retro:retro@localhost:5432/retro"),
    AUTH_GOOGLE_ID: z.string().optional(),
    AUTH_GOOGLE_SECRET: z.string().optional(),
  },
  client: {
    NEXT_PUBLIC_API_URL: z.string().url().optional(),
    NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),
  },
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    AUTH_SECRET: process.env.AUTH_SECRET,
    AUTH_URL: process.env.AUTH_URL,
    DATABASE_URL: process.env.DATABASE_URL,
    AUTH_GOOGLE_ID: process.env.AUTH_GOOGLE_ID,
    AUTH_GOOGLE_SECRET: process.env.AUTH_GOOGLE_SECRET,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  },
  skipValidation: !isProduction && process.env.SKIP_ENV_VALIDATION === "true",
  emptyStringAsUndefined: true,
});
