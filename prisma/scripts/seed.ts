import { OnboardImplementorCommand } from "#/commands/onboard-implementor";
import { OnboardUserCommand } from "#/commands/onboard-user";
import { objectId } from "#/lib/crypto";
import { Database, db } from "#/lib/db";
import fixtures from "./fixtures";

async function seedDatabase() {
  await truncateTables();
  await createSystemUser(db);
  await createImplementors(db);
  await createPermissions(db);
  await createRoles(db);
  await createUsers(db);
  await createHubs(db);
  // await createSupervisors(db);
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
  TRUNCATE TABLE implementors, implementor_avatars, implementor_invites, files, users, accounts, sessions, verification_tokens, user_avatars, implementor_members, roles, member_roles, permissions, role_permissions, user_recent_opens, member_permissions, hubs, students, fellows, supervisors, schools;
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

async function createImplementors(db: Database) {
  const onboard = new OnboardImplementorCommand(db);
  for (let implementor of fixtures.implementors) {
    await onboard.run({
      name: implementor.name,
      contactEmail: implementor.contactEmail,
      inviterId: "system",
      avatarUrl: implementor.avatarUrl,
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
  for (let { implementorByEmail, ...user } of fixtures.users) {
    const implementor = await db.implementor.findFirstOrThrow({
      where: { contactEmail: implementorByEmail },
    });

    const response = await onboard.run({
      email: user.email,
      name: user.name,
      implementorId: implementor.id,
      inviterId: "system",
      role: user.implementorRole,
      avatarUrl: user.avatarUrl ?? undefined,
    });

    if (user.account) {
      await db.account.create({
        data: {
          type: user.account.type,
          provider: user.account.provider,
          providerAccountId: user.account.providerAccountId,
          userId: response.userId,
        },
      });
    }
  }
}

async function createHubs(db: Database) {
  for (let hub of fixtures.hubs) {
    let coordinator: any = null;
    if (hub.hubCoordinatorByEmail) {
      coordinator = await db.user.findFirstOrThrow({
        where: { email: hub.hubCoordinatorByEmail },
        include: {
          memberships: true,
        },
      });
    }

    const implementor = await db.implementor.findFirstOrThrow();

    const coordinatorId = coordinator?.memberships[0].id;
    const implementorId =
      coordinator?.memberships[0].implementorId ?? implementor.id;
    await db.hub.create({
      data: {
        id: objectId("hub"),
        visibleId: hub.visibleId,
        hubName: hub.hubName,
        coordinatorId: coordinatorId ?? null,
        implementorId: implementorId ?? null,
      },
    });
  }
}

async function createSupervisors(db: Database) {
  for (let supervisor of fixtures.supervisors) {
    const user = await db.user.findFirstOrThrow({
      where: { email: supervisor.memberEmail },
      include: {
        memberships: {
          include: { hubs: true },
        },
      },
    });

    console.log({ user: JSON.stringify(user) });
    await db.supervisor.create({
      data: {
        id: objectId("sup"),
        visibleId: supervisor.visibleId,
        supervisorName: supervisor.name,
        idNumber: supervisor.idNumber,
        cellNumber: supervisor.cellNumber,
        mpesaNumber: supervisor.mpesaNumber,
        email: supervisor.email,
        member: {
          connect: { id: user.memberships[0]?.id },
        },
        hub: {
          connect: { id: user.memberships[0]?.hubs[0]?.id },
        },
      },
    });
  }
}
