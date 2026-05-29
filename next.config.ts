import type { NextConfig } from "next";

const csp = [
  "default-src 'self'",
  // Next.js inline scripts + React hydration
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  // Styles: inline styles are used extensively via style= props
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  // Supabase API + Google AI
  `connect-src 'self' ${process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://*.supabase.co'} https://generativelanguage.googleapis.com wss://*.supabase.co https://*.i.posthog.com https://us.posthog.com`,
  "img-src 'self' data: blob: https://lh3.googleusercontent.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  { key: 'Content-Security-Policy', value: csp },
];

const nextConfig: NextConfig = {
  devIndicators: false,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/ingest/static/:path*',
        destination: 'https://us-assets.i.posthog.com/static/:path*',
      },
      {
        source: '/ingest/array/:path*',
        destination: 'https://us-assets.i.posthog.com/array/:path*',
      },
      {
        source: '/ingest/:path*',
        destination: 'https://us.i.posthog.com/:path*',
      },
    ];
  },
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
