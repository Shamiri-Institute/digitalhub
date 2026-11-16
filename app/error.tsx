"use client";

import * as Sentry from "@sentry/nextjs";
import Link from "next/link";
import * as React from "react";
import { Icons } from "#/components/icons";
import { Button } from "#/components/ui/button";
import { toastOnError } from "#/components/ui/use-toast";
import { signOut } from "#/lib/auth-client";

export default function AppError({
  error,
  reset,
  retry,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  retry: () => void;
}) {
  // effect: reports the caught render error to Sentry or the console once per error instance
  React.useEffect(() => {
    if (process.env.NEXT_PUBLIC_ENV !== "production") {
      console.error(error);
    } else {
      Sentry.captureException(error);
    }
  }, [error]);

  const handleRedirectToLogin = async () => {
    localStorage.clear();
    sessionStorage.clear();
    reset();
    await signOut();
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-md overflow-hidden rounded-xl border bg-white">
        <div className="flex justify-center bg-primary px-6 py-6">
          <Icons.logo className="h-8 w-auto text-white" />
        </div>
        <div className="flex flex-col items-center gap-3 px-6 py-6 text-center sm:px-12">
          <h2 className="text-lg font-bold text-primary">Oops! Something went wrong!</h2>
          <p className="text-sm text-muted-foreground">
            We couldn&apos;t complete your request. Please try refreshing the page or clearing your
            browser cache.
            <br />
            Need assistance? Our support team is ready to help!{" "}
            <Link
              href="mailto:tech-support@shamiri.institute"
              className="font-semibold text-primary underline-offset-4 hover:underline"
            >
              tech-support@shamiri.institute
            </Link>
          </p>
        </div>
        <div className="flex flex-col gap-3 border-t px-6 py-6 sm:px-12">
          <Button onClick={retry}>Try again</Button>
          <Button onClick={toastOnError(handleRedirectToLogin)} variant="outline">
            Sign out and clear saved data
          </Button>
        </div>
      </div>
    </div>
  );
}
