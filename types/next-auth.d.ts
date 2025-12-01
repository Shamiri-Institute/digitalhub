import "next-auth";

import { JWTMembership, SessionUser } from "#/lib/auth-options";

declare module "next-auth" {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user: SessionUser;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    activeMembership?: JWTMembership;
    memberships?: JWTMembership[];
  }
}
