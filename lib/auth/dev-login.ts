"use server";

import { cookies } from "next/headers";

import { isCredentialAuthAllowed, TEST_USER_EMAILS } from "#/lib/auth/credential-auth";
import { createSession } from "#/lib/auth/session";
import { db } from "#/lib/db";

const INVALID = { error: "Invalid email or password" } as const;

/**
 * Email test login for development, testing and training. Writes the same database session that
 * Google sign-in creates, so there is no separate token path to secure.
 */
export async function devLogin(email: string, password: string): Promise<{ error?: string }> {
  if (!isCredentialAuthAllowed()) {
    return { error: "Email login is not available in this environment" };
  }
  if (!TEST_USER_EMAILS.has(email) || password !== process.env.TEST_USER_PASSWORD) {
    return INVALID;
  }

  const user = await db.user.findUnique({
    where: { email, archivedAt: null },
    select: { id: true },
  });
  if (!user) {
    return INVALID;
  }

  const { name, value, expires } = await createSession(user.id);
  (await cookies()).set(name, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: name.startsWith("__Secure-"),
    path: "/",
    expires,
  });
  return {};
}
