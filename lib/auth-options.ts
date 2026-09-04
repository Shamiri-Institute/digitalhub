import type { ImplementerRole } from "@prisma/client";
import { addBreadcrumb } from "@sentry/nextjs";
import type { AuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { cache } from "react";
import { z } from "zod";

import { env } from "#/env";
import { isCredentialAuthAllowed } from "#/lib/auth/credential-auth";
import { adapter, sessionCookie } from "#/lib/auth/session";
import { db } from "#/lib/db";
import { getDefaultProjectId } from "#/lib/default-project-id";

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

      // setActiveMembership bumps updatedAt, so the newest row is the active one.
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
