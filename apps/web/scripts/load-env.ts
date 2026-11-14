import * as nextEnv from "@next/env";

// Node's ESM loader and Drizzle's CommonJS loader expose @next/env differently.
const envModule = nextEnv as typeof nextEnv & { default?: typeof nextEnv };
(envModule.default ?? envModule).loadEnvConfig(
  process.cwd(),
  process.env.NODE_ENV !== "production",
);
