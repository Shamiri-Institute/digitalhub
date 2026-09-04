import { PrismaAdapter } from "@next-auth/prisma-adapter";
import type { ImplementerRole } from "@prisma/client";
import { addBreadcrumb } from "@sentry/nextjs";
import type { AuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { cache } from "react";
import { z } from "zod";

import { env } from "#/env";
import { isCredentialAuthAllowed } from "#/lib/auth/credential-auth";
import { db } from "#/lib/db";
import { getDefaultProjectId } from "#/lib/default-project-id";

// Google OAuth credentials are optional when the email test login is enabled (dev/test/training).
const googleConfigSchema = z.object({
  GOOGLE_ID: z.string(),
  GOOGLE_SECRET: z.string(),
});

const googleConfig = googleConfigSchema.safeParse(process.env);
if (!googleConfig.success && !isCredentialAuthAllowed()) {
  throw new Error("Google OAuth credentials are required in production");
}

export interface JWTMembership {
  id: number;
  implementerId: string;
  implementerName: string;
  role: ImplementerRole;
  identifier: string | null;
  updatedAt?: Date;
}

export type SessionUser = {
  id: string | null;
  email: string | null;
  name: string | null;
  image: string | null;
  activeMembership?: JWTMembership;
  memberships?: JWTMembership[];
  activeProjectId?: string | null;
};

function parseMembershipsForJWT(userWithMemberships: {
  memberships: Array<{
    id: number;
    role: ImplementerRole;
    identifier: string | null;
    updatedAt: Date | null;
    implementer: { id: string; implementerName: string };
  }>;
}): JWTMembership[] {
  return userWithMemberships.memberships.map((m) => ({
    id: m.id,
    implementerId: m.implementer.id,
    implementerName: m.implementer.implementerName,
    role: m.role,
    identifier: m.identifier,
    updatedAt: m.updatedAt ?? undefined,
  }));
}

export const authOptions: AuthOptions = {
  secret: env.NEXTAUTH_SECRET,
  debug: process.env.DEBUG === "1" && process.env.NODE_ENV !== "production",
  // Database sessions: the cookie is a random token that points at a `sessions` row. Nothing about
  // the user lives in the cookie, so there is no signing secret that can mint a session, and a
  // session is revoked by deleting its row. The email test login (lib/auth/dev-login.ts) creates
  // the same kind of row, so every environment uses this one strategy.
  session: {
    strategy: "database",
    maxAge: 7 * 24 * 60 * 60,
    updateAge: 24 * 60 * 60,
  },
  providers: googleConfig.success
    ? [
        GoogleProvider({
          clientId: googleConfig.data.GOOGLE_ID,
          clientSecret: googleConfig.data.GOOGLE_SECRET,
          // signIn below links the Google account to the pre-provisioned user itself, after
          // checking the address is verified; no implicit linking by email.
          allowDangerousEmailAccountLinking: false,
        }),
      ]
    : [],
  adapter: PrismaAdapter(db),
  callbacks: {
    signIn: async ({ user, account, profile }) => {
      if (account?.provider !== "google" || !user.email) {
        return false;
      }
      const emailVerified = (profile as { email_verified?: boolean } | undefined)?.email_verified;
      if (emailVerified !== true) {
        return false;
      }

      // Only pre-provisioned, non-archived users may sign in.
      const userExists = await db.user.findUnique({
        where: { email: user.email, archivedAt: null },
        select: { id: true },
      });
      if (!userExists) {
        return false;
      }

      await db.user.update({
        where: { email: user.email },
        data: {
          name: profile?.name ?? user.name,
          image: profile?.image ?? user.image,
          accounts: {
            upsert: {
              where: {
                provider_providerAccountId: {
                  provider: "google",
                  providerAccountId: account.providerAccountId,
                },
              },
              create: {
                provider: "google",
                type: "oauth",
                providerAccountId: account.providerAccountId,
                refresh_token: account.refresh_token,
                access_token: account.access_token,
                expires_at: account.expires_at,
                token_type: account.token_type,
                scope: account.scope,
                id_token: account.id_token,
                session_state: account.session_state,
              },
              update: {
                refresh_token: account.refresh_token,
                access_token: account.access_token,
                expires_at: account.expires_at,
                token_type: account.token_type,
                scope: account.scope,
                id_token: account.id_token,
                session_state: account.session_state,
              },
            },
          },
        },
      });
      return true;
    },
    session: async ({ session, user }) => {
      const [defaultProjectId, dbUser] = await Promise.all([
        getDefaultProjectId(),
        db.user.findUnique({
          where: { id: user.id, archivedAt: null },
          select: {
            id: true,
            email: true,
            name: true,
            image: true,
            activeProjectId: true,
            memberships: {
              select: {
                id: true,
                role: true,
                identifier: true,
                updatedAt: true,
                implementer: {
                  select: {
                    id: true,
                    implementerName: true,
                    hubs: { select: { projectId: true } },
                  },
                },
              },
              orderBy: { updatedAt: "desc" },
            },
          },
        }),
      ]);

      if (!dbUser) {
        // Archived or deleted since login: revoke every session this user still holds.
        await db.session.deleteMany({ where: { userId: user.id } });
        addBreadcrumb({ message: "Session user not found", data: { userId: user.id } });
        session.user = { id: null, email: null, name: null, image: null };
        return session;
      }

      const activeProjectId = dbUser.activeProjectId ?? defaultProjectId;

      let filtered = dbUser.memberships.filter((m) =>
        m.implementer.hubs.some((h) => h.projectId === activeProjectId),
      );
      if (filtered.length === 0) {
        filtered = dbUser.memberships.filter((m) => m.role === "ADMIN");
      }
      const memberships = parseMembershipsForJWT({ memberships: filtered });

      if (memberships.length === 0) {
        console.warn(`User ${dbUser.email} has no memberships`);
      }

      // The active membership is the most recently updated one; setActiveMembership bumps the
      // timestamp on a row the caller owns. The client never chooses the role.
      const sortedMemberships = [...memberships].sort(
        (a, b) => (b.updatedAt?.getTime() ?? 0) - (a.updatedAt?.getTime() ?? 0),
      );

      const sessionUser: SessionUser = {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        image: dbUser.image,
        activeMembership: sortedMemberships[0],
        memberships,
        activeProjectId,
      };

      session.user = sessionUser;
      return session;
    },
  },
};

export const getCachedSession = cache(async () => getServerSession(authOptions));
