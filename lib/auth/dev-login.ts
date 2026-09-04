"use server";

import { cookies } from "next/headers";

import { isCredentialAuthAllowed, TEST_USER_EMAILS } from "#/lib/auth/credential-auth";
import { createSession } from "#/lib/auth/session";
import { db } from "#/lib/db";

const INVALID = { error: "Invalid email or password" } as const;

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

  const { name, options, value, expires } = await createSession(user.id);
  (await cookies()).set(name, value, { ...options, expires });
  return {};
}
