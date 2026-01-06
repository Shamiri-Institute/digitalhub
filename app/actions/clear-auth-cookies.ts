"use server";

import { cookies } from "next/headers";

/**
 * Server Action to clear all authentication-related cookies.
 *
 * This action is used during error recovery to ensure a clean session state
 * before redirecting users to the login page.
 *
 * Why use a Server Action instead of document.cookie:
 * 1. SSR-safe: Server Actions work correctly during server-side rendering
 * 2. Security: Avoids direct client-side cookie manipulation (Biome noDocumentCookie rule)
 * 3. HttpOnly cookies: Can delete HttpOnly cookies that client-side JS cannot access
 * 4. Consistency: Uses the same Next.js cookies API as the rest of the application
 *
 * @see https://nextjs.org/docs/app/api-reference/functions/cookies
 */
export async function clearAuthCookies(): Promise<void> {
  const cookieStore = await cookies();

  const authCookiesToClear = [
    "next-auth.session-token",
    "next-auth.callback-url",
    "next-auth.csrf-token",
    "__Secure-next-auth.session-token",
    "__Secure-next-auth.callback-url",
    "__Secure-next-auth.csrf-token",
    "session",
  ];

  for (const cookieName of authCookiesToClear) {
    cookieStore.delete(cookieName);
  }
}
