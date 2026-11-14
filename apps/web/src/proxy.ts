import createIntlMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

const handleI18nRouting = createIntlMiddleware(routing);
const publicPages = new Set(["/", "/login", "/register"]);

export function proxy(request: NextRequest) {
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

  if (!publicPages.has(pathnameWithoutLocale) && !getSessionCookie(request)) {
    const loginUrl = new URL(`/${locale ?? routing.defaultLocale}/login`, request.url);
    loginUrl.searchParams.set("callbackUrl", `${pathname}${search}`);

    return Response.redirect(loginUrl);
  }

  return handleI18nRouting(request);
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};

import { getSessionCookie } from "better-auth/cookies";
import type { NextRequest } from "next/server";
