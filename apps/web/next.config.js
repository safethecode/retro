import bundleAnalyzer from '@next/bundle-analyzer';
import { createSecureHeaders } from 'next-secure-headers';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: createSecureHeaders({
          contentSecurityPolicy: {
            directives: {
              defaultSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'"],
              scriptSrc: ["'self'", "'unsafe-eval'", "'unsafe-inline'"],
              imgSrc: ["'self'", 'data:', 'https:'],
              fontSrc: ["'self'", 'data:'],
              connectSrc: ["'self'", 'https://vitals.vercel-insights.com'],
            },
          },
          forceHTTPSRedirect: [
            true,
            { maxAge: 63072000, includeSubDomains: true },
          ],
          referrerPolicy: 'same-origin',
        }),
      },
    ];
  },
};

export default withBundleAnalyzer(nextConfig);
