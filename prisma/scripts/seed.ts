import { db, Database } from "#/lib/db";
import { OnboardOrganizationCommand } from "#/commands/onboard-organization";

import fixtures from "./fixtures";
import { sendEmail } from "#/emails";
import OrganizationWelcomer from "#/emails/organization-welcomer";

async function seedDatabase() {
  // await createSystemUser(db);
  // await createOrganizations(db);

  await sendEmail({
    email: "edmund@agency.fund",
    subject: `Africa Mental Health Research & Training Foundation on Shamiri Digital Hub`,
    react: OrganizationWelcomer({
      name: "Africa Mental Health Research & Training Foundation",
      email: "info@amhf.or.ke",
    }),
  });
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

async function createSystemUser(db: Database) {
  await db.user.create({
    data: {
      id: "system",
      email: "tech+system@shamiri.institute",
    },
  });
}

async function createOrganizations(db: Database) {
  const onboard = new OnboardOrganizationCommand(db);
  for (let organization of fixtures.organizations) {
    await onboard.run({
      name: organization.name,
      contactEmail: organization.contactEmail,
      inviterId: "system",
    });
  }
}
