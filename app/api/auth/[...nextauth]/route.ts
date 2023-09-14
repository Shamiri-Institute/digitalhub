import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { z } from "zod";

const config = z
  .object({
    GOOGLE_ID: z.string(),
    GOOGLE_SECRET: z.string(),
  })
  .parse(process.env);

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: config.GOOGLE_ID,
      clientSecret: config.GOOGLE_SECRET,
    }),
  ],
};

export const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
