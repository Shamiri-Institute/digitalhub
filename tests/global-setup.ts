import { chromium } from "@playwright/test";
import { encode } from "next-auth/jwt";
import path from "node:path";

import { db } from "#/lib/db";

async function generateSessionToken(email: string) {
  const user = await db.user.findUniqueOrThrow({
    where: { email },
    include: {
      memberships: true,
    },
  });

  const jwtPayload = {
    name: user.name,
    email: user.email,
    picture: null,
    sub: user.id,
    memberships: user.memberships.map((m) => ({
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

const sessionFixtures = [
  {
    userEmail: "shadrack.lilan@shamiri.institute",
    stateFile: "supervisor-state.json",
  },
  {
    userEmail: "edmund@shamiri.institute",
    stateFile: "hub-coordinator-state.json",
  },
  {
    userEmail: "benny@shamiri.institute",
    stateFile: "operations-state.json",
  },
];

async function globalSetup() {
  const browser = await chromium.launch();

  for (let { userEmail, stateFile } of sessionFixtures) {
    const sessionToken = await generateSessionToken(userEmail);
    const context = await browser.newContext({
      storageState: path.join(__dirname, `./fixtures/${stateFile}`),
    });

    let futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    const futureTimestamp = Math.floor(futureDate.getTime() / 1000);

    await context.addCookies([
      {
        name: "next-auth.session-token",
        value: sessionToken,
        domain: "localhost",
        path: "/",
        httpOnly: true,
        sameSite: "Lax",
        expires: futureTimestamp,
      },
    ]);
    await context.storageState({ path: stateFile });
  }

  await browser.close();
}

export default globalSetup;
