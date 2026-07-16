import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
	pages: {
		signIn: "/login",
		error: "/login",
	},
	callbacks: {
		jwt({ token, user }) {
			if (user) {
				token.id = user.id;
			}
			return token;
		},
		session({ session, token }) {
			if (token && session.user) {
				session.user.id = token.id as string;
			}
			return session;
		},
	},
	providers: [],
};
