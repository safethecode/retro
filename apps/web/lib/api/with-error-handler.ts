import type { NextRequest } from "next/server";
import { internalErrorResponse } from "./response";

type RouteContext<T extends Record<string, string> = Record<string, string>> = {
	params: Promise<T>;
};

type RouteHandler<T extends Record<string, string> = Record<string, string>> = (
	request: NextRequest,
	context: RouteContext<T>,
) => Promise<Response>;

export function withErrorHandler<
	T extends Record<string, string> = Record<string, string>,
>(handler: RouteHandler<T>): RouteHandler<T> {
	return async (request, context) => {
		try {
			return await handler(request, context);
		} catch (error) {
			console.error("API Error:", error);

			if (error instanceof Error) {
				return internalErrorResponse(
					process.env.NODE_ENV === "development"
						? error.message
						: "Internal server error",
				);
			}

			return internalErrorResponse();
		}
	};
}
