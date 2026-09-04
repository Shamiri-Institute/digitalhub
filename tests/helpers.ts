import path from "node:path";

import { createSession } from "#/lib/auth/session";
import { db } from "#/lib/db";

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
  const user = await db.user.findUniqueOrThrow({ where: { email }, select: { id: true } });
  return (await createSession(user.id)).value;
}
