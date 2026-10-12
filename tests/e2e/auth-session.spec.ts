import { expect, test } from "@playwright/test";
import { eq } from "drizzle-orm";

import { db } from "#/db/client";
import { adminUser, implementerMember, session, user } from "#/db/schema";
import { sessionCookieFor, signInWithEmail } from "#/tests/helpers";
import { getUrl } from "#/tests/pages/helpers";
import { type Role, pickUser } from "#/tests/platform-routes";

const loginUrl = new RegExp(`^${getUrl("/login")}`);

/**
 * A new admin with an admin profile of its own, so a test can sign it out or archive it without
 * touching a user another spec signs in as.
 */
async function createAdmin() {
  const seededAdmin = await pickUser("ADMIN");
  const seededMembership = await db.query.implementerMember.findFirst({
    where: (m, { and, eq }) => and(eq(m.userId, seededAdmin.id), eq(m.role, "ADMIN")),
    columns: { implementerId: true },
  });
  if (!seededMembership) throw new Error("No ADMIN membership to copy");
  const email = `auth-session-${Date.now()}-${Math.random().toString(36).slice(2)}@test.com`;
  const [createdUser] = await db
    .insert(user)
    .values({ email, name: "Auth Session Test" })
    .returning({ id: user.id });
  if (!createdUser) throw new Error("Could not create the test user");
  const [profile] = await db
    .insert(adminUser)
    .values({
      email,
      adminName: "Auth Session Test",
      implementerId: seededMembership.implementerId,
    })
    .returning({ id: adminUser.id });
  if (!profile) throw new Error("Could not create the test admin profile");
  await db.insert(implementerMember).values({
    implementerId: seededMembership.implementerId,
    userId: createdUser.id,
    role: "ADMIN",
    identifier: profile.id,
  });
  return { id: createdUser.id, email, profileId: profile.id };
}

async function deleteAdmin(admin: { id: string; profileId: string }) {
  await db.delete(session).where(eq(session.userId, admin.id));
  await db.delete(implementerMember).where(eq(implementerMember.userId, admin.id));
  await db.delete(adminUser).where(eq(adminUser.id, admin.profileId));
  await db.delete(user).where(eq(user.id, admin.id));
}

test("a request without a session cookie goes to the login page with the path", async ({
  request,
}) => {
  const res = await request.get(getUrl("/hc/schools"), { maxRedirects: 0 });
  expect(res.status()).toBe(307);
  expect(res.headers().location).toBe("/login?next=%2Fhc%2Fschools");
});

// Each of these pages loads the signed-in user's profile, which must redirect, not crash, once the
// session behind the cookie is gone.
const pagesThatLoadTheProfile: Array<[Role, string]> = [
  ["SUPERVISOR", "/sc/fellows"],
  ["FELLOW", "/fel/portal"],
  ["HUB_COORDINATOR", "/hc/schools"],
  ["OPERATIONS", "/ops/reporting/expenses/payout-history"],
];

for (const [role, route] of pagesThatLoadTheProfile) {
  test(`deleting the session row sends ${route} to the login page`, async ({ context, page }) => {
    // Only this test's session is deleted; the seeded user's other sessions are left alone.
    const cookie = await sessionCookieFor((await pickUser(role)).email);
    await context.addCookies([cookie]);
    const [token = ""] = decodeURIComponent(cookie.value).split(".");
    await page.goto(getUrl(route));
    await expect(page).toHaveURL(getUrl(route));
    // Sets the session data cookie as well, if a cookie cache were enabled.
    expect((await page.request.get(getUrl("/api/auth/get-session"))).ok()).toBe(true);

    await db.delete(session).where(eq(session.token, token));
    await page.goto(getUrl(route));
    await expect(page).toHaveURL(loginUrl);
  });
}

test("signing out from the user menu deletes the session", async ({ context, page }) => {
  const admin = await createAdmin();
  try {
    await signInWithEmail(context, admin.email);
    await page.goto(getUrl("/admin/schedule"));
    await page.getByAltText("Profile arrow drop down icon").click();
    await page.getByRole("menuitem", { name: "Sign out" }).click();
    await expect(page).toHaveURL(loginUrl);
    // The browser drops its cookie either way; only the database shows the session was revoked.
    expect(await db.$count(session, eq(session.userId, admin.id))).toBe(0);

    await page.goto(getUrl("/admin/schedule"));
    await expect(page).toHaveURL(loginUrl);
  } finally {
    await deleteAdmin(admin);
  }
});

test("archiving a signed-in user signs them out and blocks new sessions", async ({
  context,
  page,
}) => {
  const admin = await createAdmin();
  try {
    await signInWithEmail(context, admin.email);
    await page.goto(getUrl("/admin/schedule"));
    await expect(page).toHaveURL(getUrl("/admin/schedule"));

    await db.update(user).set({ archivedAt: new Date() }).where(eq(user.id, admin.id));
    await page.goto(getUrl("/admin/schedule"));
    await expect(page).toHaveURL(loginUrl);
    expect(await db.$count(session, eq(session.userId, admin.id))).toBe(0);

    await expect(sessionCookieFor(admin.email)).rejects.toThrow("This account is archived");
  } finally {
    await deleteAdmin(admin);
  }
});

test("Google sign-in redirects to Google with our callback path", async ({ request }) => {
  const res = await request.post(getUrl("/api/auth/sign-in/social"), {
    data: { provider: "google", callbackURL: "/?login=1", errorCallbackURL: "/login" },
    headers: { origin: getUrl("") },
  });
  expect(res.status()).toBe(200);
  const { url } = (await res.json()) as { url: string };
  const googleUrl = new URL(url);
  expect(googleUrl.origin).toBe("https://accounts.google.com");
  expect(googleUrl.searchParams.get("redirect_uri")).toBe(getUrl("/api/auth/callback/google"));
});

test("a Google callback without a valid state goes to an error page and sets no cookie", async ({
  request,
}) => {
  const res = await request.get(getUrl("/api/auth/callback/google?code=forged&state=forged"), {
    maxRedirects: 0,
  });
  expect(res.status()).toBe(302);
  expect(res.headers().location).toContain("error=");
  expect(res.headers()["set-cookie"] ?? "").not.toContain("session_token=");
});

test("dev login signs a test user in through the login form", async ({ page }) => {
  test.skip(!process.env.TEST_USER_PASSWORD, "TEST_USER_PASSWORD is not set");
  await page.goto(getUrl("/login"));
  await page.getByTestId("email-input").fill("mikel.arteta@test.com");
  await page.getByTestId("password-input").fill(process.env.TEST_USER_PASSWORD ?? "");
  await page.getByTestId("credentials-login").click();
  await expect(page).not.toHaveURL(loginUrl);
  await expect(page).toHaveURL(/\/hc\//);
});
