import * as Sentry from "@sentry/nextjs";

import { dataCollection } from "./sentry.shared";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  tracesSampleRate: process.env.NODE_ENV === "production" ? 1 : 0,

  debug: false,

  dataCollection,

  replaysOnErrorSampleRate: 1.0,

  replaysSessionSampleRate: 0.1,

  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
    Sentry.feedbackIntegration({
      colorScheme: "system",
    }),
  ],
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
