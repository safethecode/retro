import type { NextRequest } from "next/server";
import { z } from "zod";
import {
	successResponse,
	validateBody,
	validateQuery,
	withErrorHandler,
} from "@/lib/api";

const getUsersQuerySchema = z.object({
	page: z.coerce.number().min(1).default(1),
	limit: z.coerce.number().min(1).max(100).default(10),
});

const createUserBodySchema = z.object({
	email: z.string().email(),
	name: z.string().min(1).max(100),
});

export const GET = withErrorHandler(async (request: NextRequest) => {
	const validation = validateQuery(request, getUsersQuerySchema);
	if (!validation.success) {
		return validation.response;
	}

	const { page, limit } = validation.data;

	const users = [{ id: "1", email: "user@example.com", name: "Example User" }];

	return successResponse({
		users,
		pagination: {
			page,
			limit,
			total: users.length,
		},
	});
});

export const POST = withErrorHandler(async (request: NextRequest) => {
	const validation = await validateBody(request, createUserBodySchema);
	if (!validation.success) {
		return validation.response;
	}

	const { email, name } = validation.data;

	const newUser = {
		id: crypto.randomUUID(),
		email,
		name,
		createdAt: new Date().toISOString(),
	};

	return successResponse(newUser, 201);
});
