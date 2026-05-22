const { withSentryConfig } = require("@sentry/nextjs");

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
  env: {
    APP_ENV: process.env.APP_ENV,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; " +
              "script-src 'self' 'unsafe-inline'; " +
              "style-src 'self' 'unsafe-inline'; " +
              "img-src 'self' data: blob: https://lh3.googleusercontent.com https://shamiri-assets.s3.af-south-1.amazonaws.com https://*.s3.amazonaws.com; " +
              "font-src 'self'; " +
              "connect-src 'self' https://o4505804271845376.ingest.sentry.io https://o4505804271845376.ingest.us.sentry.io https://*.s3.af-south-1.amazonaws.com https://*.s3.amazonaws.com; " +
              "frame-src https://dash.shamiri.institute https://*.s3.af-south-1.amazonaws.com https://*.s3.amazonaws.com; " +
              "frame-ancestors 'none'; " +
              "base-uri 'self'; " +
              "form-action 'self'",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=*, microphone=(), geolocation=(), browsing-topics=()",
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/hc",
        destination: "/hc/schedule",
        permanent: false,
      },
      {
        source: "/sc",
        destination: "/sc/schedule",
        permanent: false,
      },
      {
        source: "/fel",
        destination: "/fel/schedule",
        permanent: false,
      },
      {
        source: "/cl",
        destination: "/cl/clinical",
        permanent: false,
      },
      {
        source: "/ops",
        destination: "/ops/reporting",
        permanent: false,
      },
      {
        source: "/admin",
        destination: "/admin/schedule",
        permanent: false,
      },
      {
        source: "/ct",
        destination: "/ct/clinical",
        permanent: false,
      },
    ];
  },
};

// Injected content via Sentry wizard below
module.exports = withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "shamiri-institute-21336c4e6",
  project: "digitalhub-frontend",

  // Only print logs for uploading source maps in CI
  silent: true,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Uncomment to route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  // tunnelRoute: "/monitoring",

  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true,

  // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
  // See the following for more information:
  // https://docs.sentry.io/product/crons/
  // https://vercel.com/docs/cron-jobs
  automaticVercelMonitors: true,

  reactComponentAnnotation: {
    enabled: true,
  },
});
