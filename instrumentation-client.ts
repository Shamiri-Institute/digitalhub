import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://07b0e0899b9160a522279ab4a97862e2@o4505804271845376.ingest.us.sentry.io/4505829743788032",

  // This sets the sample rate to be 10%. You may want this to be 100% while
  // in development and sample at a lower rate in production
  replaysSessionSampleRate: 0.1,

  // If the entire session is not sampled, use the below sample rate to sample
  // sessions when an error occurs.
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.replayIntegration({
      // Additional SDK configuration goes in here, for example:
      maskAllText: true,
      blockAllMedia: true,
    }),
    Sentry.feedbackIntegration({
      // Additional SDK configuration goes in here, for example:
      colorScheme: "system",
    }),
  ],
});
