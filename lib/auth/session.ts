import { randomBytes } from "node:crypto";
import { PrismaAdapter } from "@next-auth/prisma-adapter";

import { db } from "#/lib/db";

const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export const adapter = PrismaAdapter(db);

function required<T>(method: T | undefined, name: string): T {
  if (!method) {
    throw new Error(`The auth adapter must implement ${name}`);
  }
  return method;
}

const createSessionRow = required(adapter.createSession, "createSession");
export const getSessionAndUser = required(adapter.getSessionAndUser, "getSessionAndUser");

export function sessionCookie() {
  const url =
    process.env.NEXTAUTH_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  const secure = url.startsWith("https://");
  return {
    name: secure ? "__Secure-next-auth.session-token" : "next-auth.session-token",
    options: { httpOnly: true, sameSite: "lax" as const, path: "/", secure },
  };
}

export async function createSession(userId: string) {
  const expires = new Date(Date.now() + SESSION_MAX_AGE_MS);
  const { sessionToken } = await createSessionRow({
    sessionToken: randomBytes(32).toString("hex"),
    userId,
    expires,
  });
  return { ...sessionCookie(), value: sessionToken, expires };
}
