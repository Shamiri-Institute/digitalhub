"use client";

import { CREDENTIAL_AUTH_ALLOWED_ENVS } from "#/lib/auth/credential-auth";

/**
 * Client-side check if credential authentication is allowed.
 * Uses NEXT_PUBLIC_ENV which is available in the browser.
 */
export function isCredentialAuthAllowedClient() {
  const env = process.env.NEXT_PUBLIC_ENV;
  return env ? CREDENTIAL_AUTH_ALLOWED_ENVS.includes(env) : false;
}
