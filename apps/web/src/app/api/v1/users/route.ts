import type { NextRequest } from "next/server";
import { z } from "zod";
import { parseJson, withErrorHandler } from "@/lib/http";

const getUsersQuerySchema = z.object({
	page: z.coerce.number().min(1).default(1),
	limit: z.coerce.number().min(1).max(100).default(10),
});

const createUserBodySchema = z.object({
	email: z.string().email(),
	name: z.string().min(1).max(100),
});

export const GET = withErrorHandler(async (request: NextRequest) => {
	const { page, limit } = getUsersQuerySchema.parse(
		Object.fromEntries(request.nextUrl.searchParams),
	);

	const users = [{ id: "1", email: "user@example.com", name: "Example User" }];

	return Response.json({
		data: {
			users,
			pagination: {
				page,
				limit,
				total: users.length,
			},
		},
	});
});

export const POST = withErrorHandler(async (request: NextRequest) => {
	const { email, name } = await parseJson(request, createUserBodySchema);

	const newUser = {
		id: crypto.randomUUID(),
		email,
		name,
		createdAt: new Date().toISOString(),
	};

	return Response.json({ data: newUser }, { status: 201 });
});
