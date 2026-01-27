import type { NextRequest } from "next/server";
import type { ZodSchema } from "zod";
import { validationErrorResponse } from "./response";

type ValidationResult<T> =
	| { success: true; data: T }
	| { success: false; response: ReturnType<typeof validationErrorResponse> };

export async function validateBody<T>(
	request: NextRequest,
	schema: ZodSchema<T>,
): Promise<ValidationResult<T>> {
	try {
		const body = await request.json();
		const result = schema.safeParse(body);

		if (!result.success) {
			return {
				success: false,
				response: validationErrorResponse(result.error.flatten()),
			};
		}

		return { success: true, data: result.data };
	} catch {
		return {
			success: false,
			response: validationErrorResponse({ message: "Invalid JSON body" }),
		};
	}
}

export function validateQuery<T>(
	request: NextRequest,
	schema: ZodSchema<T>,
): ValidationResult<T> {
	const params = Object.fromEntries(request.nextUrl.searchParams.entries());
	const result = schema.safeParse(params);

	if (!result.success) {
		return {
			success: false,
			response: validationErrorResponse(result.error.flatten()),
		};
	}

	return { success: true, data: result.data };
}

export function validateParams<T>(
	params: Record<string, string>,
	schema: ZodSchema<T>,
): ValidationResult<T> {
	const result = schema.safeParse(params);

	if (!result.success) {
		return {
			success: false,
			response: validationErrorResponse(result.error.flatten()),
		};
	}

	return { success: true, data: result.data };
}
