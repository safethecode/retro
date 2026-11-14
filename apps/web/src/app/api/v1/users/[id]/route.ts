import type { NextRequest } from "next/server";
import { z } from "zod";
import { AppError, parseJson, withErrorHandler } from "@/lib/http";
import { auth, requireSession } from "@/modules/auth/server";

const paramsSchema = z.object({ id: z.uuid() });
const updateSchema = z.strictObject({ name: z.string().trim().min(1).max(100) });

export const GET = withErrorHandler<{ id: string }>(async (request: NextRequest, context) => {
  const session = await requireSession(request.headers);
  const { id } = paramsSchema.parse(await context.params);
  if (session.user.id !== id) throw new AppError("FORBIDDEN", 403, "Access denied");
  return Response.json(
    { data: session.user },
    { headers: { "Cache-Control": "private, no-store" } },
  );
});

export const PUT = withErrorHandler<{ id: string }>(async (request: NextRequest, context) => {
  const session = await requireSession(request.headers);
  const { id } = paramsSchema.parse(await context.params);
  if (session.user.id !== id) throw new AppError("FORBIDDEN", 403, "Access denied");
  const body = await parseJson(request, updateSchema);
  await auth.api.updateUser({ headers: request.headers, body });
  const updated = await requireSession(request.headers);
  return Response.json(
    { data: updated.user },
    { headers: { "Cache-Control": "private, no-store" } },
  );
});
