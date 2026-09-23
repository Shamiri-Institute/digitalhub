import path from "node:path";

import type { BrowserContext } from "@playwright/test";

import { db } from "#/db/client";
import { createSession } from "#/lib/auth/session";
import { type Role, pickUser } from "#/tests/platform-routes";

export const PersonnelFixtures = {
  supervisor: {
    email: "shadrack.lilan@shamiri.institute",
    stateFile: path.join(__dirname, "./fixtures/supervisor-state.json"),
  },
  hubCoordinator: {
    email: "brandon.mochama@shamiri.institute",
    stateFile: path.join(__dirname, "./fixtures/hub-coordinator-state.json"),
  },
  fellow: {
    email: "wambugu.davis@shamiri.institute",
    stateFile: path.join(__dirname, "./fixtures/fellow-state.json"),
  },
  clinicalLead: {
    email: "stanley.george@shamiri.institute",
    stateFile: path.join(__dirname, "./fixtures/clinical-lead-state.json"),
  },
  opsUser: {
    email: "benny@shamiri.institute",
    stateFile: path.join(__dirname, "./fixtures/operations-state.json"),
  },
};

export async function generateSessionToken(email: string) {
  const user = await db.query.user.findFirst({
    where: (u, { eq }) => eq(u.email, email),
    columns: { id: true },
  });
  if (!user) throw new Error(`No user with email ${email}`);
  return (await createSession(user.id)).value;
}

/**
 * A seeded user for a role, chosen from the database rather than from a fixed email, because the
 * seed reassigns the fixture accounts. Same picker the bench harness uses, so the tests and the
 * benchmark exercise the same accounts.
 */
export async function signInAs(context: BrowserContext, role: Role) {
  const user = await pickUser(role);
  const token = await generateSessionToken(user.email);
  await context.addCookies([
    {
      name: "next-auth.session-token",
      value: token,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
      expires: Math.floor(Date.now() / 1000) + 60 * 60,
    },
  ]);
  return user;
}
