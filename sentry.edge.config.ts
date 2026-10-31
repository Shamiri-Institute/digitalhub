import * as Sentry from "@sentry/nextjs";

import { dataCollection } from "./sentry.shared";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  tracesSampleRate: process.env.NODE_ENV === "production" ? 1 : 0,

  debug: false,

  dataCollection,
});
