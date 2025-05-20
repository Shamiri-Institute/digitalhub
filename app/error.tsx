"use client";

import * as Sentry from "@sentry/nextjs";
import { signOut } from "next-auth/react";
import * as React from "react";

import { Icons } from "#/components/icons";
import { Button } from "#/components/ui/button";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    if (process.env.NEXT_PUBLIC_ENV !== "production") {
      console.error(error);
    } else {
      Sentry.captureException(error);
    }
  }, [error]);

  const handleRedirectToLogin = async () => {
    const cookiesToClear = [
      "next-auth.session-token",
      "next-auth.callback-url",
      "next-auth.csrf-token",
      "__Secure-next-auth.session-token",
      "__Secure-next-auth.callback-url",
      "__Secure-next-auth.csrf-token",
      "session",
    ];

    cookiesToClear.forEach((cookie) => {
      document.cookie = `${cookie}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      document.cookie = `${cookie}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`;
    });

    localStorage.clear();
    sessionStorage.clear();

    reset();

    await signOut({ redirect: false });
    window.location.replace("/login");
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-6">
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-border bg-white shadow-xl">
        <div className="flex flex-col items-center justify-center space-y-3 border-b border-gray-200 bg-white px-4 py-6 pt-8 text-center sm:px-16">
          <Icons.logo className="h-9 text-sky-600 lg:h-10" />
          <h2 className="text-lg font-semibold text-gray-900">
            Oops! Something went wrong!
          </h2>
          <p className="text-sm text-muted-foreground">
            We couldn&apos;t complete your request. Please try refreshing the
            page or clearing your browser cache.
            <br />
            Need assistance? Our support team is ready to help!{" "}
            <Link
              href="mailto:tech-support@@shamiri.institute"
              className="text-shamiri-blue-darker hover:underline"
            >
              tech-support@@shamiri.institute
            </Link>
          </p>
        </div>
        <div className="flex flex-col space-y-3 bg-gray-50 px-4 py-8 sm:px-16">
          <Button onClick={() => reset()} variant="outline">
            Try again
          </Button>
          <Button onClick={handleRedirectToLogin} variant="brand">
            Go to login
          </Button>
        </div>
      </div>
    </div>
  );
}
