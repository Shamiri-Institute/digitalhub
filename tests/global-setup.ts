import { chromium } from "@playwright/test";

import { PersonnelFixtures } from "#/tests/helpers";
import { generateSessionToken } from "./helpers";

const sessionFixtures = [
  {
    userEmail: PersonnelFixtures.supervisor.email,
    stateFile: PersonnelFixtures.supervisor.stateFile,
  },
  {
    userEmail: PersonnelFixtures.hubCoordinator.email,
    stateFile: PersonnelFixtures.hubCoordinator.stateFile,
  },
  {
    userEmail: PersonnelFixtures.operations.email,
    stateFile: PersonnelFixtures.operations.stateFile,
  },
  {
    userEmail: PersonnelFixtures.fellow.email,
    stateFile: PersonnelFixtures.fellow.stateFile,
  },
];

async function globalSetup() {
  const browser = await chromium.launch();

  for (let { userEmail, stateFile } of sessionFixtures) {
    console.log(`Adding session token for ${userEmail} to browser`);

    const sessionToken = await generateSessionToken(userEmail);
    const context = await browser.newContext({
      storageState: stateFile,
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
