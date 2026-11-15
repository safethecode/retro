import "server-only";

import { headers } from "next/headers";
import { AppError } from "@/lib/http/app-error";
import { auth } from "./auth";

export async function getSession(requestHeaders?: Headers) {
  return auth.api.getSession({ headers: requestHeaders ?? (await headers()) });
}

export async function requireSession(requestHeaders: Headers) {
  const session = await getSession(requestHeaders);
  if (!session) throw new AppError("UNAUTHORIZED", 401, "Authentication required");
  return session;
}
