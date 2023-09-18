import { OnboardOrganization } from "#/commands/onboarding/onboard-organization";
import { db } from "#/lib/db";

import fixtures from "./fixtures";

async function seedDatabase() {
  const onboard = new OnboardOrganization(db);
  for (let organization of fixtures.organizations) {
    await onboard.run({
      name: organization.name,
      contactEmail: organization.contactEmail,
    });
  }
}

seedDatabase()
  .then(async () => {
    await db.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
