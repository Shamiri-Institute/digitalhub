import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { chromium } from "@playwright/test";
import path from "node:path";

import { db } from "#/lib/db";

async function globalSetup() {
  const supervisorStatePath = path.resolve(__dirname, "supervisor-state.json");
  const date = new Date();

  const sessionToken = "a1b2c3d4-e5f6-47a8-b9c0-d1e2f3a4b5c6";

  const testSupervisorUser = await db.user.findUniqueOrThrow({
    where: { email: "edmund@shamiri.institute" },
  });
  const adapter = PrismaAdapter(db);
  if (!adapter.createSession) {
    throw new Error("Adapter does not have a createSession method");
  }

  await adapter.createSession({
    userId: testSupervisorUser.id,
    sessionToken,
    expires: new Date(date.getFullYear(), date.getMonth() + 1, 0),
  });

  if (!adapter.linkAccount) {
    throw new Error("Adapter does not have a linkAccount method");
  }
  await adapter.linkAccount({
    userId: testSupervisorUser.id,
    type: "oauth",
    provider: "google",
    providerAccountId: "112748200714719142639",
  });

  // await db.user.upsert({
  //   where: { email: "edmund@shamiri.institute" },
  //   create: {
  //     sessions: {
  //       create: {
  //         expires: new Date(date.getFullYear(), date.getMonth() + 1, 0),
  //         sessionToken,
  //       },
  //     },
  //     accounts: {
  //       create: {
  //         type: "oauth",
  //         provider: "google",
  //         providerAccountId: "112748200714719142639",
  //         access_token:
  //           "ya29.a0AfB_byBp1egTRagy938KJ-SlrIm0BgR16y1bU_B17_Usuzz1vBym6I6t6N5CWbOlI3iPr7mrxYMhibOqlTRwfzw4DFF3e4f6SoOkifd_uC6bLxbWSiXJMwfQnhna0gFHqweDg7DxfMMG3gwzzDDsGZ6IaPB_tHsESd9iaCgYKAXkSARESFQHGX2Mi5r_MqaqaVEjq5PBSTuQryg0171",
  //         token_type: "bearer",
  //         scope:
  //           "https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile openid",
  //       },
  //     },
  //   },
  //   update: {},
  // });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    storageState: supervisorStatePath,
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
  await context.storageState({ path: supervisorStatePath });
  await browser.close();
}

export default globalSetup;
