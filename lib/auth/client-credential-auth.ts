"use client";

export const CREDENTIAL_AUTH_ALLOWED_ENVS = ["development", "testing", "training"];

export function isCredentialAuthAllowedClient() {
  const env = process.env.NEXT_PUBLIC_ENV;
  return env ? CREDENTIAL_AUTH_ALLOWED_ENVS.includes(env) : false;
}
