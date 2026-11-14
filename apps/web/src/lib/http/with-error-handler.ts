import type { NextRequest } from "next/server";
import { AppError, toErrorResponse } from "./app-error";

type RouteParams = Record<string, string | string[]>;

type RouteContext<T extends RouteParams = RouteParams> = {
  params: Promise<T>;
};

type RouteHandler<T extends RouteParams = RouteParams> = (
  request: NextRequest,
  context: RouteContext<T>,
) => Promise<Response>;

export function withErrorHandler<T extends RouteParams = RouteParams>(
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
