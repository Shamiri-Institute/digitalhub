"use client";

import * as Sentry from "@sentry/nextjs";
import Link from "next/link";
import { useEffect } from "react";
import { Button } from "#/components/ui/button";

export default function PlatformError({ error, retry }: { error: unknown; retry: () => void }) {
  // effect: reports the caught render error to Sentry or the console once per error instance
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_ENV !== "production") {
      console.error(error);
    } else {
      Sentry.captureException(error);
    }
  }, [error]);

  return (
    <div className="flex w-full items-start justify-center px-4 py-16">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border bg-background shadow-xl">
        <div className="space-y-3 px-4 py-6 text-center sm:px-16">
          <h1 className="text-lg font-semibold">Oops! Something went wrong!</h1>
          <p className="text-sm text-muted-foreground">
            This page could not load. Try again. If the problem continues, email{" "}
            <Link
              href="mailto:tech-support@shamiri.institute"
              className="text-shamiri-blue-darker hover:underline"
            >
              tech-support@shamiri.institute
            </Link>
            .
          </p>
        </div>
        <div className="border-t bg-background-secondary px-4 py-8 sm:px-16">
          <Button className="w-full" onClick={retry}>
            Try again
          </Button>
        </div>
      </div>
    </div>
  );
}
