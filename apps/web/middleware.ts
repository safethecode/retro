import createIntlMiddleware from "next-intl/middleware";
import { routing } from "@/i18n";
import { auth } from "@/lib/auth";

const intlMiddleware = createIntlMiddleware(routing);

const publicPages = ["/", "/login", "/register"];

const authMiddleware = auth((req) => {
	const { pathname } = req.nextUrl;

	if (
		pathname.startsWith("/api") ||
		pathname.startsWith("/_next") ||
		pathname.includes(".")
	) {
		return;
	}

	const pathnameWithoutLocale = routing.locales.reduce(
		(path, locale) =>
			path.startsWith(`/${locale}/`) || path === `/${locale}`
				? path.slice(locale.length + 1) || "/"
				: path,
		pathname,
	);

	const isPublicPage = publicPages.includes(pathnameWithoutLocale);

	if (!isPublicPage && !req.auth) {
		const loginUrl = new URL("/login", req.url);
		loginUrl.searchParams.set("callbackUrl", pathname);
		return Response.redirect(loginUrl);
	}

	return intlMiddleware(req);
});

export default authMiddleware;

export const config = {
	matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
