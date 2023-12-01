import { PrismaAdapter } from "@next-auth/prisma-adapter";
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
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  providers: [
    GoogleProvider({
      clientId: config.GOOGLE_ID,
      clientSecret: config.GOOGLE_SECRET,
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
          // where: { email: user.email },
          where: { email: "tech+system@shamiri.institute" },
          select: { name: true },
        });
        if (userExists && !userExists.name) {
          await db.user.update({
            // where: { email: user.email },
            where: { email: "tech+system@shamiri.institute" },
            data: {
              name: profile?.name,
              // @ts-ignore - this is a bug in the types, `picture` is a valid on the `Profile` type
              image: profile?.picture,
            },
          });
        }
      }
      return true;
    },
    session: async ({ session, token }) => {
      const user = await db.user.findUnique({
        where: {
          id: token.sub,
        },
        select: {
          email: true,
          name: true,
          avatar: {
            select: { file: true },
          },
          memberships: {
            select: {
              implementer: true,
              role: true,
            },
          },
        },
      });
      session.user = {
        id: token.sub,
        name: user?.name,
        email: user?.email,
        roles: user?.memberships.map((m) => m.role),
        // @ts-ignore
        ...(token || session).user,
      };
      return session;
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };

export type SessionUser = {
  email: string;
  name: string | null;
  avatarUrl: string | null;
  memberships: {
    organization: string;
    roles: string[];
  }[];
};
