"use client";

import { CREDENTIAL_AUTH_ALLOWED_ENVS } from "#/lib/auth/credential-auth-envs";

export function isCredentialAuthAllowedClient() {
  const env = process.env.NEXT_PUBLIC_ENV;
  return env ? CREDENTIAL_AUTH_ALLOWED_ENVS.includes(env) : false;
}
