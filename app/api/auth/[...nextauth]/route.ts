import NextAuth, { type AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { z } from "zod";

import { db } from "#/lib/db";
import { UserModel } from "#/models/user";

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
  callbacks: {
    // async session({ session, user: sessionUser }) {
    //   const user = await new UserModel(db).findCurrentUser(sessionUser.email);
    //   session.user.email = sessionUser.email;
    //   session.user.name = sessionUser.name ?? null;
    //   session.user.avatarUrl = sessionUser.image ?? null;
    //   return session;
    // },
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
