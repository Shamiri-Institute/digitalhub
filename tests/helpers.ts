import path from "node:path";
import { encode, type JWT } from "next-auth/jwt";

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
  const user = await db.user.findUniqueOrThrow({
    where: { email },
    include: {
      memberships: {
        include: {
          implementer: {
            select: {
              id: true,
              implementerName: true,
            },
          },
        },
      },
    },
  });

  const processedMemberships = user.memberships.map((m) => ({
    id: m.id,
    implementerId: m.implementerId,
    implementerName: m.implementer.implementerName,
    role: m.role,
    identifier: m.identifier,
    updatedAt: m.updatedAt ?? undefined,
  }));

  const jwtPayload: JWT = {
    name: user.name,
    email: user.email,
    picture: null,
    sub: user.id,
    activeMembership: processedMemberships[0],
    memberships: processedMemberships,
  };

  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("NEXTAUTH_SECRET is not set");
  }
  return await encode({
    token: jwtPayload,
    secret,
  });
}
