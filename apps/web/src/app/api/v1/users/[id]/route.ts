import type { NextRequest } from "next/server";
import { z } from "zod";
import { parseJson, withErrorHandler } from "@/lib/http";

const paramsSchema = z.object({
  id: z.string().uuid(),
});

const updateUserBodySchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(1).max(100).optional(),
});

export const GET = withErrorHandler<{ id: string }>(async (_request: NextRequest, context) => {
  const { id } = paramsSchema.parse(await context.params);

  const user = {
    id,
    email: "user@example.com",
    name: "Example User",
    createdAt: new Date().toISOString(),
  };

  return Response.json({ data: user });
});

export const PUT = withErrorHandler<{ id: string }>(async (request: NextRequest, context) => {
  const { id } = paramsSchema.parse(await context.params);
  const body = await parseJson(request, updateUserBodySchema);

  const updatedUser = {
    id,
    ...body,
    updatedAt: new Date().toISOString(),
  };

  return Response.json({ data: updatedUser });
});

export const DELETE = withErrorHandler<{ id: string }>(async (_request: NextRequest, context) => {
  paramsSchema.parse(await context.params);

  return Response.json({ data: { deleted: true } });
});
