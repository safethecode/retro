import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
	pages: {
		signIn: "/login",
		error: "/login",
	},
	callbacks: {
		authorized({ auth, request: { nextUrl } }) {
			const isLoggedIn = !!auth?.user;
			const isOnDashboard = nextUrl.pathname.startsWith("/dashboard");
			const isOnAuth =
				nextUrl.pathname.startsWith("/login") ||
				nextUrl.pathname.startsWith("/register");

			if (isOnDashboard) {
				return isLoggedIn;
			}

			if (isOnAuth && isLoggedIn) {
				return Response.redirect(new URL("/dashboard", nextUrl));
			}

			return true;
		},
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
