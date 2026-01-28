import bundleAnalyzer from "@next/bundle-analyzer";
import createNextIntlPlugin from "next-intl/plugin";
import { createSecureHeaders } from "next-secure-headers";

const withBundleAnalyzer = bundleAnalyzer({
	enabled: process.env.ANALYZE === "true",
});

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
	compiler: {
		removeConsole: process.env.NODE_ENV === "production",
	},
	async headers() {
		return [
			{
				source: "/:path*",
				headers: createSecureHeaders({
					contentSecurityPolicy: {
						directives: {
							defaultSrc: ["'self'"],
							styleSrc: ["'self'", "'unsafe-inline'"],
							scriptSrc: ["'self'", "'unsafe-eval'", "'unsafe-inline'"],
							imgSrc: ["'self'", "data:", "https:"],
							fontSrc: ["'self'", "data:"],
							connectSrc: ["'self'", "https://vitals.vercel-insights.com"],
						},
					},
					forceHTTPSRedirect: [
						true,
						{ maxAge: 63072000, includeSubDomains: true },
					],
					referrerPolicy: "same-origin",
				}),
			},
		];
	},
};

export default withBundleAnalyzer(withNextIntl(nextConfig));
