import type { NextRequest } from "next/server";
import { z } from "zod";
import { AppError, parseJson, withErrorHandler } from "@/lib/http";

const loginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const { email, password } = await parseJson(request, loginBodySchema);

  if (email === "test@example.com" && password === "password") {
    return Response.json({
      data: {
        message: "Use NextAuth.js /api/auth/signin for authentication",
      },
    });
  }

  throw new AppError("INVALID_CREDENTIALS", 401, "Invalid credentials");
});
