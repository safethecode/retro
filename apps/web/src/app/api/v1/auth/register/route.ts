import type { NextRequest } from "next/server";
import { z } from "zod";
import { AppError, parseJson, withErrorHandler } from "@/lib/http";

const registerBodySchema = z.object({
	email: z.string().email(),
	password: z.string().min(8).max(100),
	name: z.string().min(1).max(100),
});

export const POST = withErrorHandler(async (request: NextRequest) => {
	const { email, name } = await parseJson(request, registerBodySchema);

	if (email === "existing@example.com") {
		throw new AppError("USER_EXISTS", 409, "User already exists");
	}

	const newUser = {
		id: crypto.randomUUID(),
		email,
		name,
		createdAt: new Date().toISOString(),
	};

	return Response.json({ data: newUser }, { status: 201 });
});
