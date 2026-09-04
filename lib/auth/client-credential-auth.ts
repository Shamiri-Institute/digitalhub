"use client";

/**
 * Environments where the email test login may be enabled. Shared with the server-side check.
 */
export const CREDENTIAL_AUTH_ALLOWED_ENVS = ["development", "testing", "training"];

/**
 * Client-side check if the email test login may be shown. Uses NEXT_PUBLIC_ENV, which is
 * available in the browser. The server still decides (lib/auth/credential-auth.ts).
 */
export function isCredentialAuthAllowedClient() {
  const env = process.env.NEXT_PUBLIC_ENV;
  return env ? CREDENTIAL_AUTH_ALLOWED_ENVS.includes(env) : false;
}
