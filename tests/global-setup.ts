import { chromium } from "@playwright/test";

import { PersonnelFixtures, sessionCookieFor } from "#/tests/helpers";

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
    userEmail: PersonnelFixtures.opsUser.email,
    stateFile: PersonnelFixtures.opsUser.stateFile,
  },
  {
    userEmail: PersonnelFixtures.fellow.email,
    stateFile: PersonnelFixtures.fellow.stateFile,
  },
  {
    userEmail: PersonnelFixtures.clinicalLead.email,
    stateFile: PersonnelFixtures.clinicalLead.stateFile,
  },
];

async function globalSetup() {
  const browser = await chromium.launch();

  for (const { userEmail, stateFile } of sessionFixtures) {
    console.log(`Adding session token for ${userEmail} to browser`);

    const context = await browser.newContext();
    await context.addCookies([await sessionCookieFor(userEmail)]);
    await context.storageState({ path: stateFile });
  }

  await browser.close();
}

export default globalSetup;
