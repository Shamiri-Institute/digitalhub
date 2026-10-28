"use client";

import { getLocalTimeZone } from "@internationalized/date";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { TIME_ZONE_COOKIE } from "#/lib/schedule-view";

/**
 * Stores the browser's time zone in the cookie the server reads with `viewerTimeZone()`, and
 * re-renders the page once it changes. Returns the browser's time zone.
 */
export function useViewerTimeZoneCookie(serverTimeZone: string | null) {
  const router = useRouter();
  const browserTimeZone = getLocalTimeZone();
  // effect: the server reads the browser's time zone from this cookie to work out dates and times
  useEffect(() => {
    if (browserTimeZone === serverTimeZone) return;
    // oxlint-disable-next-line unicorn/no-document-cookie -- one cookie, no Cookie Store API in all browsers yet
    document.cookie = `${TIME_ZONE_COOKIE}=${encodeURIComponent(browserTimeZone)}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }, [browserTimeZone, serverTimeZone, router]);
  return browserTimeZone;
}

/** For server pages that show times: see useViewerTimeZoneCookie. */
export function ViewerTimeZoneCookie({ serverTimeZone }: { serverTimeZone: string | null }) {
  useViewerTimeZoneCookie(serverTimeZone);
  return null;
}
