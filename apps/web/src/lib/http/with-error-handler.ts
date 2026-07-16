import type { NextRequest } from "next/server";
import { AppError, toErrorResponse } from "./app-error";

type RouteContext<T extends Record<string, string> = Record<string, string>> = {
  params: Promise<T>;
};

type RouteHandler<T extends Record<string, string> = Record<string, string>> = (
  request: NextRequest,
  context: RouteContext<T>,
) => Promise<Response>;

export function withErrorHandler<T extends Record<string, string> = Record<string, string>>(
  handler: RouteHandler<T>,
): RouteHandler<T> {
  return async (request, context) => {
    try {
      return await handler(request, context);
    } catch (error) {
      if (!(error instanceof AppError)) {
        console.error("Unexpected API error", error);
      }

      return toErrorResponse(error);
    }
  };
}
