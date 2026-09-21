// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  // Configured via env so forks use their own project; unset = Sentry disabled.
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Trace only production and preview builds. Local dev measures the network to the
  // remote database, not the code, and pollutes performance issues with 2s spans.
  tracesSampleRate: process.env.NODE_ENV === "production" ? 1 : 0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,
});
