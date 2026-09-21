import path from "node:path";

import { db } from "#/db/client";
import { createSession } from "#/lib/auth/session";

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
