import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { addBreadcrumb } from "@sentry/nextjs";
import { type BetterAuthOptions, betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { cache } from "react";
import { z } from "zod";

import { db } from "#/db/client";
import { account, rateLimit, session, user, verification } from "#/db/schema";
import { env } from "#/env";
import { isCredentialAuthAllowed } from "#/lib/auth/credential-auth";
import { loadSessionUser, type SessionUser } from "#/lib/auth/session-user";
import { objectId } from "#/lib/crypto";

export type { JWTMembership, SessionUser } from "#/lib/auth/session-user";

const googleConfig = z
  .object({ GOOGLE_ID: z.string(), GOOGLE_SECRET: z.string() })
  .safeParse(process.env);
if (!googleConfig.success && !isCredentialAuthAllowed()) {
  throw new Error(
    "No sign-in method is configured: set GOOGLE_ID and GOOGLE_SECRET, or set TEST_USER_PASSWORD in development, testing or training",
  );
}

const vercelOrigins = [process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL]
  .filter(Boolean)
  .map((host) => `https://${host}`);

export const authOptions = {
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL ?? vercelOrigins[0],
  trustedOrigins: vercelOrigins,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user, session, account, verification, rateLimit },
  }),
  session: { expiresIn: 7 * 24 * 60 * 60, updateAge: 24 * 60 * 60 },
  socialProviders: googleConfig.success
    ? {
        google: {
          clientId: googleConfig.data.GOOGLE_ID,
          clientSecret: googleConfig.data.GOOGLE_SECRET,
          disableSignUp: true,
          overrideUserInfoOnSignIn: true,
        },
      }
    : {},
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google"],
      // oxlint-disable-next-line typescript/no-deprecated -- staff provision users, so most rows have email_verified false; 1.8 removes this option
      requireLocalEmailVerified: false,
    },
  },
  user: {
    validateUserInfo: ({ user: providerUser }) =>
      providerUser.emailVerified === true
        ? undefined
        : { error: "email_not_verified", errorDescription: "Google has not verified this email" },
  },
  databaseHooks: {
    user: { create: { before: () => Promise.resolve(false) } },
    session: {
      create: {
        before: async (newSession) => {
          const activeUser = await db.query.user.findFirst({
            where: (u, { and, eq, isNull }) =>
              and(eq(u.id, newSession.userId), isNull(u.archivedAt)),
            columns: { id: true },
          });
          if (!activeUser) {
            throw new APIError("FORBIDDEN", {
              code: "account_archived",
              message: "This account is archived",
            });
          }
        },
      },
    },
  },
  onAPIError: {
    onError: (error) => {
      console.error("[better-auth][error]", error, {
        cause: error instanceof Error ? error.cause : undefined,
      });
    },
  },
  rateLimit: { enabled: true, storage: "database" },
  advanced: {
    ipAddress: { ipAddressHeaders: ["x-real-ip", "x-forwarded-for"] },
    database: {
      generateId: ({ model }) =>
        objectId(model === "session" ? "authsession" : model.toLowerCase()),
    },
  },
} satisfies BetterAuthOptions;

export const auth = betterAuth({ ...authOptions, plugins: [nextCookies()] });

export const getCachedSession = cache(async (): Promise<{ user: SessionUser } | null> => {
  const authSession = await auth.api.getSession({ headers: await headers() });
  if (!authSession) {
    return null;
  }
  const sessionUser = await loadSessionUser(authSession.user.id);
  if (!sessionUser) {
    await db.delete(session).where(eq(session.userId, authSession.user.id));
    addBreadcrumb({ message: "Session user not found", data: { userId: authSession.user.id } });
    return null;
  }
  return { user: sessionUser };
});
