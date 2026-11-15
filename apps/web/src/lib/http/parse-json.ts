import type { ZodType } from "zod";
import { AppError } from "./app-error";
import { readRequestBody } from "./request-body";

export async function parseJson<T>(request: Request, schema: ZodType<T>): Promise<T> {
  let input: unknown;
  const body = await readRequestBody(request);

  try {
    input = JSON.parse(body);
  } catch {
    throw new AppError("INVALID_JSON", 400, "Invalid JSON body");
  }

  return schema.parse(input);
}
