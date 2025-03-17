import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { ImplementerRole, Prisma } from "@prisma/client";
import { addBreadcrumb } from "@sentry/nextjs";
import { compare } from "bcryptjs";
import NextAuth, { type AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";

import { z } from "zod";

import { db } from "#/lib/db";

const config = z
  .object({
    GOOGLE_ID: z.string(),
    GOOGLE_SECRET: z.string(),
  })
  .parse(process.env);

const providers: AuthOptions["providers"] =
  process.env.ENV === "production"
    ? [
        GoogleProvider({
          clientId: config.GOOGLE_ID,
          clientSecret: config.GOOGLE_SECRET,
          allowDangerousEmailAccountLinking: true,
        }),
      ]
    : [
        GoogleProvider({
          clientId: config.GOOGLE_ID,
          clientSecret: config.GOOGLE_SECRET,
          allowDangerousEmailAccountLinking: true,
        }),
        CredentialsProvider({
          name: "Credentials",
          credentials: {
            email: {
              label: "Email",
              type: "email",
              placeholder: "username@example.com",
            },
            password: { label: "Password", type: "password" },
          },
          async authorize(credentials, _req) {
            const user = await db.user.findUnique({
              where: { email: credentials?.email },
            });

            if (!user) {
              return null;
            }

            if (!user.password) {
              return null;
            }

            const validPassword = await compare(
              credentials?.password!,
              user.password,
            );

            return validPassword ? user : null;
          },
        }),
      ];

const authOptions: AuthOptions = {
  debug: process.env.DEBUG === "1",
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  providers,
  adapter: PrismaAdapter(db),
  callbacks: {
    signIn: async ({ user, account, profile }) => {
      if (!user.email) {
        return false;
      }

      if (account?.provider === "credentials") {
        return true;
      }

      if (account?.provider === "google") {
        const userExists = await db.user.findUnique({
          where: { email: user.email },
          select: { name: true },
        });
        if (userExists && !userExists.name) {
          await db.user.update({
            where: { email: user.email },
            data: {
              name: profile?.name,
              // @ts-expect-error - this is a bug in the types, `picture` is a valid on the `Profile` type
              image: profile?.picture,
              accounts: {
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
              },
            },
          });
        }
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
    jwt: async ({ token, user, trigger }) => {
      if (trigger === "signIn") {
        if (user.email) {
          const currentUser = await db.user.findUnique({
            where: { email: user.email },
            select: {
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
          if (!currentUser) {
            console.error("User not found in database");
            return token;
          }

          if (currentUser) {
            token.memberships = parseMembershipsForJWT(currentUser) || [];
            token.activeMembership = token.memberships[0];
          }
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
