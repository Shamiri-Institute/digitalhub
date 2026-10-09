import { betterAuth } from "better-auth";
import { testUtils } from "better-auth/plugins";

import { authOptions } from "#/lib/auth";

const testAuth = betterAuth({ ...authOptions, plugins: [testUtils()] });

/** A signed session cookie for the user, backed by a new session row. Dev login and tests only. */
export async function createSessionCookie(userId: string) {
  const { test } = await testAuth.$context;
  const [cookie] = await test.getCookies({ userId });
  if (!cookie) {
    throw new Error(`Could not create a session for ${userId}`);
  }
  return cookie;
}
