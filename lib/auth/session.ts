import { randomBytes } from "node:crypto";

import { db } from "#/lib/db";

const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export function sessionCookieName(): string {
  const url =
    process.env.NEXTAUTH_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  return url.startsWith("https://")
    ? "__Secure-next-auth.session-token"
    : "next-auth.session-token";
}

export async function createSession(userId: string) {
  const expires = new Date(Date.now() + SESSION_MAX_AGE_MS);
  const { sessionToken } = await db.session.create({
    data: { sessionToken: randomBytes(32).toString("hex"), userId, expires },
    select: { sessionToken: true },
  });
  return { name: sessionCookieName(), value: sessionToken, expires };
}
