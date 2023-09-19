import { db, Database } from "#/lib/db";
import { OnboardOrganizationCommand } from "#/commands/onboard-organization";
import { OnboardUserCommand } from "#/commands/onboard-user";

import fixtures from "./fixtures";

async function seedDatabase() {
  await createSystemUser(db);
  await createOrganizations(db);
  await createUsers(db);
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
      name: "Shamiri System",
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

async function createUsers(db: Database) {
  const onboard = new OnboardUserCommand(db);
  for (let { organizationByEmail, ...user } of fixtures.users) {
    const organization = await db.organization.findFirstOrThrow({
      where: { contactEmail: organizationByEmail },
    });

    await onboard.run({
      email: user.email,
      organizationId: organization.id,
      inviterId: "system",
    });
  }
}
