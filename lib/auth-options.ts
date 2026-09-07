import { addBreadcrumb } from "@sentry/nextjs";
import type { AuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { cache } from "react";
import { z } from "zod";

import { env } from "#/env";
import { isCredentialAuthAllowed } from "#/lib/auth/credential-auth";
import { adapter, sessionCookie } from "#/lib/auth/session";
import { loadSessionUser } from "#/lib/auth/session-user";
import { db } from "#/lib/db";

export type { JWTMembership, SessionUser } from "#/lib/auth/session-user";

const googleConfigSchema = z.object({
  GOOGLE_ID: z.string(),
  GOOGLE_SECRET: z.string(),
});

const googleConfig = googleConfigSchema.safeParse(process.env);
if (!googleConfig.success && !isCredentialAuthAllowed()) {
  throw new Error(
    "No sign-in method is configured: set GOOGLE_ID and GOOGLE_SECRET, or set TEST_USER_PASSWORD in development, testing or training",
  );
}

export const authOptions: AuthOptions = {
  secret: env.NEXTAUTH_SECRET,
  debug: process.env.DEBUG === "1" && process.env.NODE_ENV !== "production",
  session: {
    strategy: "database",
    maxAge: 7 * 24 * 60 * 60,
    updateAge: 24 * 60 * 60,
  },
  cookies: { sessionToken: sessionCookie() },
  providers: googleConfig.success
    ? [
        GoogleProvider({
          clientId: googleConfig.data.GOOGLE_ID,
          clientSecret: googleConfig.data.GOOGLE_SECRET,
          // Google verifies the address, and signIn refuses unverified profiles.
          allowDangerousEmailAccountLinking: true,
        }),
      ]
    : [],
  adapter,
  callbacks: {
    signIn: async ({ user, account, profile }) => {
      if (account?.provider !== "google" || !user.email) {
        return false;
      }
      const emailVerified = (profile as { email_verified?: boolean } | undefined)?.email_verified;
      if (emailVerified !== true) {
        return false;
      }

      const userExists = await db.user.findUnique({
        where: { email: user.email, archivedAt: null },
        select: { id: true },
      });
      if (!userExists) {
        return false;
      }

      await db.user.update({
        where: { email: user.email },
        data: { name: profile?.name ?? user.name, image: profile?.image ?? user.image },
      });
      return true;
    },
    session: async ({ session, user }) => {
      const sessionUser = await loadSessionUser(user.id);
      if (!sessionUser) {
        await db.session.deleteMany({ where: { userId: user.id } });
        addBreadcrumb({ message: "Session user not found", data: { userId: user.id } });
        session.user = { id: null, email: null, name: null, image: null };
        return session;
      }
      session.user = sessionUser;
      return session;
    },
  },
};

export const getCachedSession = cache(async () => getServerSession(authOptions));
