import type { NextRequest } from "next/server";
import { z } from "zod";
import {
	errorResponse,
	successResponse,
	validateBody,
	withErrorHandler,
} from "@/lib/api";

const registerBodySchema = z.object({
	email: z.string().email(),
	password: z.string().min(8).max(100),
	name: z.string().min(1).max(100),
});

export const POST = withErrorHandler(async (request: NextRequest) => {
	const validation = await validateBody(request, registerBodySchema);
	if (!validation.success) {
		return validation.response;
	}

	const { email, name } = validation.data;

	if (email === "existing@example.com") {
		return errorResponse("User already exists", 409);
	}

	const newUser = {
		id: crypto.randomUUID(),
		email,
		name,
		createdAt: new Date().toISOString(),
	};

	return successResponse(newUser, 201);
});
