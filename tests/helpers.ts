import { JWT, encode } from "next-auth/jwt";
import path from "node:path";

import { db } from "#/lib/db";

export const PersonnelFixtures = {
  supervisor: {
    email: "shadrack.lilan@shamiri.institute",
    stateFile: path.join(__dirname, `./fixtures/supervisor-state.json`),
  },
  hubCoordinator: {
    email: "abdulghani.noor@shamiri.institute",
    stateFile: path.join(__dirname, `./fixtures/hub-coordinator-state.json`),
  },
  fellow: {
    email: "wambugu.davis@shamiri.institute",
    stateFile: path.join(__dirname, `./fixtures/fellow-state.json`),
  },
  clinicalLead: {
    email: "stanley.george@shamiri.institute",
    stateFile: path.join(__dirname, `./fixtures/clinical-lead-state.json`),
  },
  opsUser: {
    email: "benny@shamiri.institute",
    stateFile: path.join(__dirname, `./fixtures/operations-state.json`),
  },
};

export async function generateSessionToken(email: string) {
  const user = await db.user.findUniqueOrThrow({
    where: { email },
    include: { memberships: true },
  });

  const jwtPayload: JWT = {
    name: user.name,
    email: user.email,
    picture: null,
    sub: user.id,
    activeMembership: user.memberships[0],
    memberships: user.memberships.map((m) => ({
      id: m.id,
      implementerId: m.implementerId,
      role: m.role,
      identifier: m.identifier,
    })),
  };

  return await encode({
    token: jwtPayload,
    secret: process.env.NEXTAUTH_SECRET!,
  });
}
