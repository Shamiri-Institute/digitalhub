"use client";

import * as Sentry from "@sentry/nextjs";
import NextError from "next/error";
import { useEffect } from "react";

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        {/* This is the default Next.js error component but it doesn't allow omitting the statusCode property yet. */}
        {/* Using 0 as statusCode since NextError requires a number */}
        <NextError statusCode={0} />
      </body>
    </html>
  );
}
