import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://07b0e0899b9160a522279ab4a97862e2@o4505804271845376.ingest.us.sentry.io/4505829743788032",

  tracesSampleRate: 1,

  debug: false,
});
