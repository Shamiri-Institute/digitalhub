import { PrismaAdapter } from "@next-auth/prisma-adapter";
import type { ImplementerRole, Prisma } from "@prisma/client";
import { addBreadcrumb } from "@sentry/nextjs";
import type { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { z } from "zod";

import { isCredentialAuthAllowed, TEST_CREDENTIALS } from "#/lib/auth/credential-auth";
import { db } from "#/lib/db";

// Google OAuth credentials are optional when credential auth is allowed (dev/test environments)
const googleConfigSchema = z.object({
  GOOGLE_ID: z.string(),
  GOOGLE_SECRET: z.string(),
});

// In production, Google OAuth is required. In dev/test environments, it's optional.
const googleConfig = googleConfigSchema.safeParse(process.env);
if (!googleConfig.success && !isCredentialAuthAllowed()) {
  // Only throw if we're in production and Google config is missing
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
          updatedAt: true;
        };
      };
    };
  }>,
): JWTMembership[] {
  return userWithMemberships.memberships.map((m) => ({
    id: m.id,
    implementerId: m.implementer.id,
    implementerName: m.implementer.implementerName,
    role: m.role,
    identifier: m.identifier,
    updatedAt: m.updatedAt ?? undefined,
  }));
}

// Build providers array based on environment and available credentials
function buildProviders(): AuthOptions["providers"] {
  const providers: AuthOptions["providers"] = [];

  // Add Google OAuth provider if credentials are available
  if (googleConfig.success) {
    providers.push(
      GoogleProvider({
        clientId: googleConfig.data.GOOGLE_ID,
        clientSecret: googleConfig.data.GOOGLE_SECRET,
        allowDangerousEmailAccountLinking: true,
      }),
    );
  }

  // Add Credentials provider only in allowed environments (development, testing, training)
  if (isCredentialAuthAllowed()) {
    providers.push(
      CredentialsProvider({
        id: "credentials",
        name: "Email",
        credentials: {
          email: { label: "Email", type: "email" },
          password: { label: "Password", type: "password" },
        },
        async authorize(credentials) {
          // Double-check environment at runtime for safety
          if (!isCredentialAuthAllowed()) {
            console.error("Credential auth attempted in disallowed environment");
            return null;
          }

          if (!credentials?.email || !credentials?.password) {
            return null;
          }

          // Check if email exists in test credentials map
          const expectedPassword = TEST_CREDENTIALS[credentials.email];
          if (!expectedPassword) {
            return null;
          }

          // Validate password
          if (credentials.password !== expectedPassword) {
            return null;
          }

          // Look up user in database
          const user = await db.user.findUnique({
            where: { email: credentials.email },
            select: {
              id: true,
              email: true,
              name: true,
              image: true,
            },
          });

          if (!user) {
            return null;
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
          };
        },
      }),
    );
  }

  return providers;
}

export const authOptions: AuthOptions = {
  debug: process.env.DEBUG === "1",
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  providers: buildProviders(),
  adapter: PrismaAdapter(db),
  callbacks: {
    signIn: async ({ user, account, profile }) => {
      if (!user.email) {
        return false;
      }

      // Handle credentials provider
      if (account?.provider === "credentials") {
        // Double-check environment for safety
        if (!isCredentialAuthAllowed()) {
          console.error("Credential sign-in attempted in disallowed environment");
          return false;
        }
        // User validation already done in authorize function
        const userExists = await db.user.findUnique({
          where: { email: user.email },
          select: { id: true },
        });
        return !!userExists;
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
              updatedAt: true,
            },
            orderBy: {
              updatedAt: "desc",
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

      // Use token data if available (for updates), otherwise use database data
      const memberships: JWTMembership[] = token.memberships || parseMembershipsForJWT(user);
      // Select the most recently updated membership if no active membership is set
      const activeMembership: JWTMembership | undefined =
        token.activeMembership ||
        (memberships.length > 0
          ? memberships.sort(
              (a, b) => (b.updatedAt?.getTime() ?? 0) - (a.updatedAt?.getTime() ?? 0),
            )[0]
          : undefined);

      const sessionUser: SessionUser = {
        id: token.sub || null,
        email: user.email,
        name: user.name,
        image: user.image,
        activeMembership,
        memberships,
      };

      session.user = sessionUser;
      return session;
    },
    jwt: async ({ token, user, account: _account, trigger, session }) => {
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

        // Now get the memberships using the user's ID, ordered by most recently updated
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
          orderBy: {
            updatedAt: "desc",
          },
        });

        console.log("memberships", memberships, currentUser);

        if (memberships.length > 0) {
          const processedMemberships = memberships.map((m) => ({
            id: m.id,
            implementerId: m.implementer.id,
            implementerName: m.implementer.implementerName,
            role: m.role,
            identifier: m.identifier,
            updatedAt: m.updatedAt ?? undefined,
          }));

          token.memberships = processedMemberships;
          token.activeMembership =
            token.activeMembership ||
            (processedMemberships.length > 0 ? processedMemberships[0] : undefined);
        }
      } else if (trigger === "update" && session?.user) {
        token.activeMembership = session.user.activeMembership;
      }

      return token;
    },
  },
};
