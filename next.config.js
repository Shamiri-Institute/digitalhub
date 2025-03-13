/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    instrumentationHook: true,
  },
  env: {
    APP_ENV: process.env.APP_ENV,
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
    ];
  },
};

module.exports = nextConfig;

// Injected content via Sentry wizard below

const { withSentryConfig } = require("@sentry/nextjs");

module.exports = withSentryConfig(
  module.exports,
  {
    // For all available options, see:
    // https://github.com/getsentry/sentry-webpack-plugin#options
    silent: true,
    org: "shamiri-institute-21336c4e6",
    project: "digitalhub-frontend",
  },
  {
    // For all available options, see:
    // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/
    widenClientFileUpload: true,
    transpileClientSDK: true,
    tunnelRoute: "/monitoring",
    hideSourceMaps: true,
    disableLogger: true,
    automaticVercelMonitors: true,
  },
);
