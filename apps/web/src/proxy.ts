import createIntlMiddleware from "next-intl/middleware";
import { routing } from "@/i18n";
import { auth } from "@/modules/auth/server";

const handleI18nRouting = createIntlMiddleware(routing);
const publicPages = new Set(["/", "/login", "/register"]);

export const proxy = auth((request) => {
	const { pathname, search } = request.nextUrl;
	const locale = routing.locales.find(
		(candidate) => pathname === `/${candidate}` || pathname.startsWith(`/${candidate}/`),
	);
	const pathnameWithoutLocale = routing.locales.reduce(
		(path, locale) =>
			path.startsWith(`/${locale}/`) || path === `/${locale}`
				? path.slice(locale.length + 1) || "/"
				: path,
		pathname,
	);

	if (!publicPages.has(pathnameWithoutLocale) && !request.auth) {
		const loginUrl = new URL(`/${locale ?? routing.defaultLocale}/login`, request.url);
		loginUrl.searchParams.set("callbackUrl", `${pathname}${search}`);

		return Response.redirect(loginUrl);
	}

	return handleI18nRouting(request);
});

export const config = {
	matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
