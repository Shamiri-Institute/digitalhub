import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient();

export async function signOut() {
  await authClient.signOut({ fetchOptions: { throw: true } });
  window.location.replace("/login");
}
