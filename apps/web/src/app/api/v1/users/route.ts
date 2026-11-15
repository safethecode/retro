import type { NextRequest } from "next/server";
import { z } from "zod";
import { withErrorHandler } from "@/lib/http";
import { requireSession } from "@/modules/auth/server";

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export const GET = withErrorHandler(async (request: NextRequest) => {
  const session = await requireSession(request.headers);
  const { page, limit } = querySchema.parse(Object.fromEntries(request.nextUrl.searchParams));
  return Response.json(
    { data: { users: page === 1 ? [session.user] : [], pagination: { page, limit, total: 1 } } },
    { headers: { "Cache-Control": "private, no-store" } },
  );
});
