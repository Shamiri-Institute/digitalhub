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
      <div className="w-full max-w-md overflow-hidden rounded-xl border bg-white">
        <div className="space-y-3 px-6 py-6 text-center sm:px-12">
          <h1 className="text-xl font-bold text-primary">Oops! Something went wrong!</h1>
          <p className="text-sm text-muted-foreground">
            This page could not load. Try again. If the problem continues, email{" "}
            <Link
              href="mailto:tech-support@shamiri.institute"
              className="text-primary hover:underline"
            >
              tech-support@shamiri.institute
            </Link>
            .
          </p>
        </div>
        <div className="border-t px-6 py-6 sm:px-12">
          <Button className="w-full" onClick={retry}>
            Try again
          </Button>
        </div>
      </div>
    </div>
  );
}
