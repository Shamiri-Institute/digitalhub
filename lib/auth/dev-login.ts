"use server";

import { cookies } from "next/headers";

import { db } from "#/db/client";
import { isCredentialAuthAllowed, TEST_USER_EMAILS } from "#/lib/auth/credential-auth";

const INVALID = { error: "Invalid email or password" } as const;

export async function devLogin(email: string, password: string): Promise<{ error?: string }> {
  if (!isCredentialAuthAllowed()) {
    return { error: "Email login is not available in this environment" };
  }
  if (!TEST_USER_EMAILS.has(email) || password !== process.env.TEST_USER_PASSWORD) {
    return INVALID;
  }

  const user = await db.query.user.findFirst({
    where: (u, { and, eq, isNull }) => and(eq(u.email, email), isNull(u.archivedAt)),
    columns: { id: true },
  });
  if (!user) {
    return INVALID;
  }

  // Imported here so the test-only auth instance never loads where credential login is off.
  const { createSessionCookie } = await import("#/lib/auth/test-auth");
  const { name, value, path, httpOnly, secure, expires } = await createSessionCookie(user.id);
  (await cookies()).set(name, value, {
    path,
    httpOnly,
    secure,
    sameSite: "lax",
    expires: expires ? new Date(expires * 1000) : undefined,
  });
  return {};
}
