import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/config/env";

const databaseGlobal = globalThis as typeof globalThis & { retroSql?: ReturnType<typeof postgres> };
const client =
  databaseGlobal.retroSql ?? postgres(env.DATABASE_URL, { max: 5, connect_timeout: 5 });
if (env.NODE_ENV !== "production") databaseGlobal.retroSql = client;

export const db = drizzle(client);
