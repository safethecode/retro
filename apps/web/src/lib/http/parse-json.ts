import type { ZodType } from "zod";
import { AppError } from "./app-error";

export async function parseJson<T>(request: Request, schema: ZodType<T>): Promise<T> {
	let input: unknown;

	try {
		input = await request.json();
	} catch {
		throw new AppError("INVALID_JSON", 400, "Invalid JSON body");
	}

	return schema.parse(input);
}
