import type { NextRequest } from "next/server";
import { z } from "zod";
import {
	notFoundResponse,
	successResponse,
	validateBody,
	validateParams,
	withErrorHandler,
} from "@/lib/api";

const paramsSchema = z.object({
	id: z.string().uuid(),
});

const updateUserBodySchema = z.object({
	email: z.string().email().optional(),
	name: z.string().min(1).max(100).optional(),
});

export const GET = withErrorHandler<{ id: string }>(
	async (_request: NextRequest, context) => {
		const params = await context.params;
		const validation = validateParams(params, paramsSchema);
		if (!validation.success) {
			return validation.response;
		}

		const { id } = validation.data;

		const user = {
			id,
			email: "user@example.com",
			name: "Example User",
			createdAt: new Date().toISOString(),
		};

		if (!user) {
			return notFoundResponse("User not found");
		}

		return successResponse(user);
	},
);

export const PUT = withErrorHandler<{ id: string }>(
	async (request: NextRequest, context) => {
		const params = await context.params;
		const paramsValidation = validateParams(params, paramsSchema);
		if (!paramsValidation.success) {
			return paramsValidation.response;
		}

		const bodyValidation = await validateBody(request, updateUserBodySchema);
		if (!bodyValidation.success) {
			return bodyValidation.response;
		}

		const { id } = paramsValidation.data;

		const updatedUser = {
			id,
			...bodyValidation.data,
			updatedAt: new Date().toISOString(),
		};

		return successResponse(updatedUser);
	},
);

export const DELETE = withErrorHandler<{ id: string }>(
	async (_request: NextRequest, context) => {
		const params = await context.params;
		const validation = validateParams(params, paramsSchema);
		if (!validation.success) {
			return validation.response;
		}

		return successResponse({ deleted: true });
	},
);
