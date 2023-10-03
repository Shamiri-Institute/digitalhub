import { db, Database } from "#/lib/db";
import { OnboardOrganizationCommand } from "#/commands/onboard-organization";
import { OnboardUserCommand } from "#/commands/onboard-user";

import fixtures from "./fixtures";

async function seedDatabase() {
  await truncateTables();
  await createSystemUser(db);
  await createOrganizations(db);
  await createPermissions(db);
  await createRoles(db);
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

async function truncateTables() {
  await db.$executeRaw`
  TRUNCATE TABLE organizations, organization_avatars, organization_invites, files, users, user_avatars, organization_members, roles, member_roles, permissions, role_permissions, member_permissions;
  `;
}

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
      avatarUrl: organization.avatarUrl,
    });
  }
}

async function createPermissions(db: Database) {
  for (let permission of fixtures.permissions) {
    await db.permission.create({
      data: {
        permissionLabel: permission,
      },
    });
  }
}

async function createRoles(db: Database) {
  for (let roleFixture of fixtures.roles) {
    const role = await db.role.create({
      data: {
        id: roleFixture.roleId,
        name: roleFixture.roleName,
        description: roleFixture.roleDescription,
      },
    });

    for (let permissionFixture of roleFixture.permissions) {
      const permission = await db.permission.findFirstOrThrow({
        where: { permissionLabel: permissionFixture },
      });

      await db.rolePermission.create({
        data: {
          roleId: role.id,
          permissionId: permission.id,
        },
      });
    }
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
      name: user.name,
      organizationId: organization.id,
      inviterId: "system",
      role: user.organizationRole,
      avatarUrl: user.avatarUrl,
    });
  }
}
