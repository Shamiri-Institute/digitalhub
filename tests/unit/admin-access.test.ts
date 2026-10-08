// @vitest-environment node
import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import { currentAdminUser } from "#/app/auth";
import { db, pool } from "#/db/client";
import { AdminTeam } from "#/db/enums";
import { adminUser, implementerMember, session as sessionTable, user } from "#/db/schema";
import { createAdmin, updateAdminAccess } from "#/lib/actions/admin/access";
import { hasTeamAccess, requireSuperAdmin } from "#/lib/auth/admin-access";
import { ForbiddenRoleError } from "#/lib/auth/require-auth-role";
import { loadSessionUser } from "#/lib/auth/session-user";

const session = vi.hoisted(() => ({ userId: "" }));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`redirect:${path}`);
  },
}));
// The session is built by the real loadSessionUser, so the active membership is the real one.
vi.mock("#/lib/auth-options", async () => {
  const { loadSessionUser } = await import("#/lib/auth/session-user");
  return {
    getCachedSession: async () => ({ user: await loadSessionUser(session.userId) }),
  };
});

// Seeded users (db/seed/seed.ts)
const SUPER_ADMIN = "admin@shamiri.institute";
const PLAIN_ADMIN = "plain.admin@shamiri.institute";
const CARE_ADMIN = "care.admin@shamiri.institute";
const SUPERVISOR = "shadrack.lilan@shamiri.institute";

const runId = Date.now();
const createdAdminIds: string[] = [];
const createdUserEmails: string[] = [];
const createdMembershipIds: number[] = [];
const createdTempUserIds: string[] = [];

async function userIdOf(email: string) {
  const found = await db.query.user.findFirst({
    where: (u, { eq }) => eq(u.email, email),
    columns: { id: true },
  });
  if (!found) throw new Error(`Seeded user ${email} not found; run npm run db:reset`);
  return found.id;
}

async function signInAs(email: string) {
  session.userId = await userIdOf(email);
  const active = (await loadSessionUser(session.userId))?.activeMembership;
  if (!active) throw new Error(`${email} has no active membership`);
  return active;
}

async function adminIdOf(email: string, implementerId: string) {
  const found = await db.query.adminUser.findFirst({
    where: (a, { and, eq }) => and(eq(a.email, email), eq(a.implementerId, implementerId)),
    columns: { id: true },
  });
  if (!found) throw new Error(`Admin ${email} not found in ${implementerId}`);
  return found.id;
}

/** Creates an admin as the signed-in super admin and remembers it for cleanup. */
async function createTestAdmin(label: string, overrides: { isSuperAdmin?: boolean } = {}) {
  const email = `admin-access-test-${label}-${runId}@example.com`;
  const active = await signInAs(SUPER_ADMIN);
  const response = await createAdmin({
    adminName: `Test ${label}`,
    email,
    team: null,
    isSuperAdmin: overrides.isSuperAdmin ?? false,
  });
  expect(response.success).toBe(true);
  createdUserEmails.push(email);
  const id = await adminIdOf(email, active.implementerId);
  createdAdminIds.push(id);
  return { id, email, implementerId: active.implementerId };
}

beforeEach(async () => {
  await signInAs(SUPER_ADMIN);
});

afterAll(async () => {
  try {
    const allAdminIds = createdAdminIds;
    if (allAdminIds.length > 0) {
      await db.delete(implementerMember).where(inArray(implementerMember.identifier, allAdminIds));
      await db.delete(adminUser).where(inArray(adminUser.id, allAdminIds));
    }
    if (createdMembershipIds.length > 0) {
      await db.delete(implementerMember).where(inArray(implementerMember.id, createdMembershipIds));
    }
    if (createdTempUserIds.length > 0) {
      await db.delete(user).where(inArray(user.id, createdTempUserIds));
    }
    if (createdUserEmails.length > 0) {
      await db.delete(user).where(inArray(user.email, createdUserEmails));
    }
  } finally {
    await pool.end();
  }
});

describe("hasTeamAccess", () => {
  it("passes a super admin for every team", () => {
    const admin = { isSuperAdmin: true, team: null };
    expect(hasTeamAccess(admin, AdminTeam.CARE)).toBe(true);
    expect(hasTeamAccess(admin, AdminTeam.RESEARCH)).toBe(true);
  });

  it("passes an admin only for their own team", () => {
    const admin = { isSuperAdmin: false, team: AdminTeam.CARE };
    expect(hasTeamAccess(admin, AdminTeam.CARE)).toBe(true);
    expect(hasTeamAccess(admin, AdminTeam.RESEARCH)).toBe(false);
  });

  it("passes an admin without a team for no team", () => {
    const admin = { isSuperAdmin: false, team: null };
    expect(hasTeamAccess(admin, AdminTeam.CARE)).toBe(false);
    expect(hasTeamAccess(admin, AdminTeam.RESEARCH)).toBe(false);
  });
});

describe("requireSuperAdmin", () => {
  it("passes a super admin and returns the session's implementer", async () => {
    const active = await signInAs(SUPER_ADMIN);
    const context = await requireSuperAdmin();
    expect(context.implementerId).toBe(active.implementerId);
  });

  it("rejects an admin who is not a super admin", async () => {
    await signInAs(PLAIN_ADMIN);
    await expect(requireSuperAdmin()).rejects.toBeInstanceOf(ForbiddenRoleError);
  });

  it("rejects an admin in a team who is not a super admin", async () => {
    await signInAs(CARE_ADMIN);
    await expect(requireSuperAdmin()).rejects.toBeInstanceOf(ForbiddenRoleError);
  });

  it("rejects a user who is not an admin", async () => {
    await signInAs(SUPERVISOR);
    await expect(requireSuperAdmin()).rejects.toBeInstanceOf(ForbiddenRoleError);
  });
});

describe("currentAdminUser", () => {
  it("returns the admin profile of the active implementer", async () => {
    const active = await signInAs(PLAIN_ADMIN);
    const admin = await currentAdminUser();
    expect(admin?.profile.implementerId).toBe(active.implementerId);
    expect(admin?.profile.isSuperAdmin).toBe(false);
  });

  it("returns null when the profile belongs to another implementer", async () => {
    const active = await signInAs(SUPER_ADMIN);
    const otherProfile = await db.query.adminUser.findFirst({
      where: (a, { and, eq, ne }) =>
        and(eq(a.email, SUPER_ADMIN), ne(a.implementerId, active.implementerId)),
      columns: { id: true },
    });
    if (!otherProfile) throw new Error("Expected the seeded super admin in a second implementer");

    // A user whose only membership points at a profile of another implementer.
    const [tempUser] = await db
      .insert(user)
      .values({ email: `admin-access-test-mismatch-${runId}@example.com` })
      .returning({ id: user.id });
    if (!tempUser) throw new Error("Could not create the test user");
    createdTempUserIds.push(tempUser.id);
    const [membership] = await db
      .insert(implementerMember)
      .values({
        implementerId: active.implementerId,
        userId: tempUser.id,
        role: "ADMIN",
        identifier: otherProfile.id,
      })
      .returning({ id: implementerMember.id });
    if (!membership) throw new Error("Could not create the test membership");
    createdMembershipIds.push(membership.id);

    session.userId = tempUser.id;
    expect(await currentAdminUser()).toBeNull();
  });

  it("signs the user out when the profile has no implementer", async () => {
    const active = await signInAs(SUPER_ADMIN);
    const [tempUser] = await db
      .insert(user)
      .values({ email: `admin-access-test-legacy-${runId}@example.com` })
      .returning({ id: user.id });
    if (!tempUser) throw new Error("Could not create the test user");
    createdTempUserIds.push(tempUser.id);
    const [legacyProfile] = await db
      .insert(adminUser)
      .values({
        email: `admin-access-test-legacy-${runId}@example.com`,
        adminName: "Legacy admin",
        implementerId: null,
      })
      .returning({ id: adminUser.id });
    if (!legacyProfile) throw new Error("Could not create the legacy profile");
    createdAdminIds.push(legacyProfile.id);
    await db.insert(implementerMember).values({
      implementerId: active.implementerId,
      userId: tempUser.id,
      role: "ADMIN",
      identifier: legacyProfile.id,
    });
    await db.insert(sessionTable).values({
      sessionToken: `admin-access-test-${runId}`,
      userId: tempUser.id,
      expires: new Date(Date.now() + 60_000),
    });

    session.userId = tempUser.id;
    await expect(currentAdminUser()).rejects.toThrow("redirect:/login?error=");
    const remaining = await db.query.session.findMany({
      where: (s, { eq }) => eq(s.userId, tempUser.id),
    });
    expect(remaining).toHaveLength(0);
  });
});

describe("createAdmin", () => {
  it("creates the admin profile, the user and the ADMIN membership in the caller's implementer", async () => {
    const created = await createTestAdmin("new", { isSuperAdmin: true });

    const profile = await db.query.adminUser.findFirst({
      where: (a, { eq }) => eq(a.id, created.id),
    });
    expect(profile).toMatchObject({
      email: created.email,
      implementerId: created.implementerId,
      isSuperAdmin: true,
      team: null,
    });

    const createdUser = await db.query.user.findFirst({
      where: (u, { eq }) => eq(u.email, created.email),
      with: { memberships: true },
    });
    expect(createdUser?.memberships).toHaveLength(1);
    expect(createdUser?.memberships[0]).toMatchObject({
      role: "ADMIN",
      implementerId: created.implementerId,
      identifier: created.id,
    });
  });

  it("stores the team", async () => {
    const active = await signInAs(SUPER_ADMIN);
    const email = `admin-access-test-team-${runId}@example.com`;
    const response = await createAdmin({
      adminName: "Test team",
      email,
      team: AdminTeam.RESEARCH,
      isSuperAdmin: false,
    });
    expect(response.success).toBe(true);
    createdUserEmails.push(email);
    const id = await adminIdOf(email, active.implementerId);
    createdAdminIds.push(id);

    const profile = await db.query.adminUser.findFirst({ where: (a, { eq }) => eq(a.id, id) });
    expect(profile?.team).toBe(AdminTeam.RESEARCH);
  });

  it("refuses a second admin with the same email in the implementer", async () => {
    const created = await createTestAdmin("duplicate");
    const response = await createAdmin({
      adminName: "Test duplicate",
      email: created.email,
      team: null,
      isSuperAdmin: false,
    });
    expect(response).toMatchObject({
      success: false,
      message: "An admin with this email already exists",
    });
  });

  it("reuses the user of an existing email and leaves their active membership alone", async () => {
    const supervisorId = await userIdOf(SUPERVISOR);
    const before = (await loadSessionUser(supervisorId))?.activeMembership;
    const active = await signInAs(SUPER_ADMIN);

    const response = await createAdmin({
      adminName: "Supervisor admin",
      email: SUPERVISOR,
      team: null,
      isSuperAdmin: false,
    });
    expect(response.success).toBe(true);
    createdAdminIds.push(await adminIdOf(SUPERVISOR, active.implementerId));

    const after = (await loadSessionUser(supervisorId))?.activeMembership;
    expect(after?.id).toBe(before?.id);
    expect(await db.$count(user, eq(user.email, SUPERVISOR))).toBe(1);
  });

  it("refuses a caller who is not a super admin", async () => {
    await signInAs(PLAIN_ADMIN);
    const response = await createAdmin({
      adminName: "Nope",
      email: `admin-access-test-nope-${runId}@example.com`,
      team: null,
      isSuperAdmin: false,
    });
    expect(response.success).toBe(false);
    expect(
      await db.$count(user, eq(user.email, `admin-access-test-nope-${runId}@example.com`)),
    ).toBe(0);
  });
});

describe("updateAdminAccess", () => {
  it("changes the team and super-admin flag of an admin", async () => {
    const created = await createTestAdmin("update");

    const response = await updateAdminAccess({
      adminId: created.id,
      team: AdminTeam.CARE,
      isSuperAdmin: true,
    });
    expect(response.success).toBe(true);

    const profile = await db.query.adminUser.findFirst({
      where: (a, { eq }) => eq(a.id, created.id),
    });
    expect(profile).toMatchObject({ team: AdminTeam.CARE, isSuperAdmin: true });

    const demoted = await updateAdminAccess({
      adminId: created.id,
      team: null,
      isSuperAdmin: false,
    });
    expect(demoted.success).toBe(true);
    const after = await db.query.adminUser.findFirst({
      where: (a, { eq }) => eq(a.id, created.id),
    });
    expect(after).toMatchObject({ team: null, isSuperAdmin: false });
  });

  it("refuses to remove the caller's own super-admin access", async () => {
    const active = await signInAs(SUPER_ADMIN);
    const ownId = await adminIdOf(SUPER_ADMIN, active.implementerId);

    const response = await updateAdminAccess({ adminId: ownId, team: null, isSuperAdmin: false });
    expect(response.success).toBe(false);
    const profile = await db.query.adminUser.findFirst({ where: (a, { eq }) => eq(a.id, ownId) });
    expect(profile?.isSuperAdmin).toBe(true);
  });

  it("does not touch an admin of another implementer", async () => {
    const active = await signInAs(SUPER_ADMIN);
    const otherImplementerAdmin = await db.query.adminUser.findFirst({
      where: (a, { and, ne, eq }) =>
        and(
          ne(a.implementerId, active.implementerId),
          eq(a.isSuperAdmin, true),
          ne(a.email, SUPER_ADMIN),
        ),
      columns: { id: true },
    });
    if (!otherImplementerAdmin) throw new Error("Expected a seeded admin in a second implementer");

    const response = await updateAdminAccess({
      adminId: otherImplementerAdmin.id,
      team: AdminTeam.CARE,
      isSuperAdmin: false,
    });
    expect(response).toMatchObject({ success: false, message: "Admin not found" });
    const unchanged = await db.query.adminUser.findFirst({
      where: (a, { and, eq }) => and(eq(a.id, otherImplementerAdmin.id)),
    });
    expect(unchanged).toMatchObject({ team: null, isSuperAdmin: true });
  });

  it("refuses a caller who is not a super admin", async () => {
    const created = await createTestAdmin("guarded");
    await signInAs(CARE_ADMIN);

    const response = await updateAdminAccess({
      adminId: created.id,
      team: AdminTeam.CARE,
      isSuperAdmin: true,
    });
    expect(response.success).toBe(false);
    const profile = await db.query.adminUser.findFirst({
      where: (a, { and, eq }) => and(eq(a.id, created.id)),
    });
    expect(profile).toMatchObject({ team: null, isSuperAdmin: false });
  });
});
