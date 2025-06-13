import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { ImplementerRole, Prisma } from "@prisma/client";
import { addBreadcrumb } from "@sentry/nextjs";
import NextAuth, { type AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { z } from "zod";

import { db } from "#/lib/db";

const config = z
  .object({
    GOOGLE_ID: z.string(),
    GOOGLE_SECRET: z.string(),
  })
  .parse(process.env);

const authOptions: AuthOptions = {
  debug: process.env.DEBUG === "1",
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  providers: [
    GoogleProvider({
      clientId: config.GOOGLE_ID,
      clientSecret: config.GOOGLE_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  adapter: PrismaAdapter(db),
  callbacks: {
    signIn: async ({ user, account, profile }) => {
      if (!user.email) {
        return false;
      }

      if (account?.provider === "google") {
        const userExists = await db.user.findUnique({
          where: { email: user.email },
          select: {
            id: true,
            name: true,
            image: true,
          },
        });

        // Only allow sign in if user exists
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
      }
      return false;
    },
    session: async ({ session, token }) => {
      const user = await db.user.findUnique({
        where: {
          id: token.sub,
        },
        include: {
          avatar: {
            select: { file: true },
          },
          memberships: {
            select: {
              id: true,
              implementer: true,
              role: true,
              identifier: true,
            },
          },
        },
      });

      if (!user) {
        addBreadcrumb({
          message: "User not found",
          data: { token },
        });
        return session;
      }

      if (user.memberships.length === 0) {
        console.warn(`User ${user.email} has no memberships`);
      }

      const memberships = parseMembershipsForJWT(user);
      const activeMembership = memberships[0];

      const sessionUser: SessionUser = {
        id: token.sub || null,
        email: user.email,
        name: user.name,
        image: user.image,
        activeMembership,
        memberships,
        // @ts-ignore
        ...(token || session).user,
      };

      session.user = sessionUser;
      return session;
    },
    jwt: async ({ token, user, account, trigger }) => {
      if (trigger === "signIn" && user?.email) {
        // First get the user by email
        const currentUser = await db.user.findUnique({
          where: { email: user.email },
          select: {
            id: true,
            email: true,
            name: true,
            image: true,
          },
        });

        if (!currentUser) {
          console.error("User not found in database");
          return token;
        }

        // Update token.sub to match the found user's ID
        token.sub = currentUser.id;

        // Now get the memberships using the user's ID
        const memberships = await db.implementerMember.findMany({
          where: {
            userId: currentUser.id,
          },
          include: {
            implementer: {
              select: {
                id: true,
                implementerName: true,
              },
            },
          },
        });

        if (memberships.length > 0) {
          const processedMemberships = memberships.map((m) => ({
            id: m.id,
            implementerId: m.implementer.id,
            role: m.role,
            identifier: m.identifier,
          }));

          token.memberships = processedMemberships;
          token.activeMembership = processedMemberships[0];
        }
      }
      return token;
    },
  },
};

function parseMembershipsForJWT(
  userWithMemberships: Prisma.UserGetPayload<{
    select: {
      memberships: {
        select: {
          id: true;
          implementer: true;
          role: true;
          identifier: true;
        };
      };
    };
  }>,
): JWTMembership[] {
  return userWithMemberships.memberships.map((m) => ({
    id: m.id,
    implementerId: m.implementer.id,
    role: m.role,
    identifier: m.identifier,
  }));
}

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };

export type SessionUser = {
  id: string | null;
  email: string | null;
  name: string | null;
  image: string | null;
  activeMembership?: JWTMembership;
  memberships?: JWTMembership[];
};

export interface JWTMembership {
  id: number;
  implementerId: string;
  role: ImplementerRole;
  identifier: string | null;
}
