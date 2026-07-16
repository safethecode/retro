import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { z } from "zod";
import { env } from "@/config/env";
import { authConfig } from "./auth.config";

const credentialsSchema = z.object({
	email: z.string().email(),
	password: z.string().min(1),
});

const googleProvider =
	env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET
		? [
				Google({
					clientId: env.AUTH_GOOGLE_ID,
					clientSecret: env.AUTH_GOOGLE_SECRET,
				}),
			]
		: [];

const nextAuth = NextAuth({
	...authConfig,
	providers: [
		...googleProvider,
		Credentials({
			name: "credentials",
			credentials: {
				email: { label: "Email", type: "email" },
				password: { label: "Password", type: "password" },
			},
			async authorize(credentials) {
				const parsed = credentialsSchema.safeParse(credentials);
				if (!parsed.success) {
					return null;
				}

				const { email, password } = parsed.data;

				if (email === "test@example.com" && password === "password") {
					return {
						id: "1",
						email: "test@example.com",
						name: "Test User",
					};
				}

				return null;
			},
		}),
	],
	session: {
		strategy: "jwt",
	},
});

export const handlers = nextAuth.handlers;
export const signIn = nextAuth.signIn;
export const signOut = nextAuth.signOut;
export const auth = nextAuth.auth;
