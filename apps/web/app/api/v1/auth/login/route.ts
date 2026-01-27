import type { NextRequest } from "next/server";
import { z } from "zod";
import {
	successResponse,
	unauthorizedResponse,
	validateBody,
	withErrorHandler,
} from "@/lib/api";

const loginBodySchema = z.object({
	email: z.string().email(),
	password: z.string().min(1),
});

export const POST = withErrorHandler(async (request: NextRequest) => {
	const validation = await validateBody(request, loginBodySchema);
	if (!validation.success) {
		return validation.response;
	}

	const { email, password } = validation.data;

	if (email === "test@example.com" && password === "password") {
		return successResponse({
			message: "Use NextAuth.js /api/auth/signin for authentication",
		});
	}

	return unauthorizedResponse("Invalid credentials");
});
