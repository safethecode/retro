import { ZodError } from "zod";

type ErrorBody = {
	error: {
		code: string;
		message: string;
		details?: unknown;
	};
};

export class AppError extends Error {
	readonly code: string;
	readonly status: number;
	readonly details?: unknown;

	constructor(code: string, status: number, message: string, details?: unknown) {
		super(message);
		this.name = "AppError";
		this.code = code;
		this.status = status;
		this.details = details;
	}
}

export function toErrorResponse(error: unknown): Response {
	if (error instanceof AppError) {
		return errorResponse(error.code, error.status, error.message, error.details);
	}

	if (error instanceof ZodError) {
		return errorResponse("VALIDATION_ERROR", 400, "Validation failed", error.flatten());
	}

	return errorResponse("INTERNAL_ERROR", 500, "Internal server error");
}

function errorResponse(code: string, status: number, message: string, details?: unknown): Response {
	const body: ErrorBody = { error: { code, message } };

	if (details !== undefined) {
		body.error.details = details;
	}

	return Response.json(body, { status });
}
