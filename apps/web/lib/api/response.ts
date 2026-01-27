import { NextResponse } from "next/server";

type SuccessResponse<T> = {
	success: true;
	data: T;
};

type ErrorResponse = {
	success: false;
	error: string;
	details?: unknown;
};

export function successResponse<T>(
	data: T,
	status = 200,
): NextResponse<SuccessResponse<T>> {
	return NextResponse.json({ success: true, data }, { status });
}

export function errorResponse(
	error: string,
	status = 400,
	details?: unknown,
): NextResponse<ErrorResponse> {
	const body: ErrorResponse = { success: false, error };
	if (details !== undefined) {
		body.details = details;
	}
	return NextResponse.json(body, { status });
}

export function notFoundResponse(
	message = "Resource not found",
): NextResponse<ErrorResponse> {
	return errorResponse(message, 404);
}

export function unauthorizedResponse(
	message = "Unauthorized",
): NextResponse<ErrorResponse> {
	return errorResponse(message, 401);
}

export function forbiddenResponse(
	message = "Forbidden",
): NextResponse<ErrorResponse> {
	return errorResponse(message, 403);
}

export function validationErrorResponse(
	details: unknown,
): NextResponse<ErrorResponse> {
	return errorResponse("Validation failed", 422, details);
}

export function internalErrorResponse(
	message = "Internal server error",
): NextResponse<ErrorResponse> {
	return errorResponse(message, 500);
}
