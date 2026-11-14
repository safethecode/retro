import { toNextJsHandler } from "better-auth/next-js";
import { readRequestBody } from "@/lib/http/request-body";
import { withErrorHandler } from "@/lib/http/with-error-handler";
import { auth } from "@/modules/auth/server";

const handlers = toNextJsHandler(auth);
export const GET = handlers.GET;
export const POST = withErrorHandler<{ all: string[] }>(async (request) => {
  const body = await readRequestBody(request);
  // Next.js can proxy NextRequest; copy plain fields instead of its internal state.
  return handlers.POST(
    new Request(request.url, { method: "POST", headers: request.headers, body }),
  );
});
