import "./scripts/load-env";

import { defineConfig } from "drizzle-kit";
import { env } from "./src/config/env";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/modules/auth/server/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: env.DATABASE_URL },
  strict: true,
});
