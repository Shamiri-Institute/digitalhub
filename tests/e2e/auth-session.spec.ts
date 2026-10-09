import { expect, test } from "@playwright/test";
import { eq } from "drizzle-orm";

import { db } from "#/db/client";
import { implementerMember, session, user } from "#/db/schema";
import { sessionCookieFor, signInWithEmail } from "#/tests/helpers";
import { getUrl } from "#/tests/pages/helpers";
import { pickUser } from "#/tests/platform-routes";

const loginUrl = new RegExp(`^${getUrl("/login")}`);

async function createSupervisorUser() {
  const supervisor = await pickUser("SUPERVISOR");
  const supervisorMembership = await db.query.implementerMember.findFirst({
    where: (m, { and, eq }) => and(eq(m.userId, supervisor.id), eq(m.role, "SUPERVISOR")),
  });
  if (!supervisorMembership) throw new Error("No supervisor membership to copy");
  const email = `auth-session-${Date.now()}-${Math.random().toString(36).slice(2)}@test.com`;
  const [createdUser] = await db
    .insert(user)
    .values({ email, name: "Auth Session Test" })
    .returning({ id: user.id });
  if (!createdUser) throw new Error("Could not create the test user");
  await db.insert(implementerMember).values({
    implementerId: supervisorMembership.implementerId,
    userId: createdUser.id,
    role: "SUPERVISOR",
    identifier: supervisorMembership.identifier,
  });
  return { id: createdUser.id, email };
}

async function deleteUser(userId: string) {
  await db.delete(implementerMember).where(eq(implementerMember.userId, userId));
  await db.delete(user).where(eq(user.id, userId));
}

test("a request without a session cookie goes to the login page with the path", async ({
  request,
}) => {
  const res = await request.get(getUrl("/hc/schools"), { maxRedirects: 0 });
  expect(res.status()).toBe(307);
  expect(res.headers().location).toBe("/login?next=%2Fhc%2Fschools");
});

test("deleting the session row signs the user out on the next request", async ({
  context,
  page,
}) => {
  const testUser = await createSupervisorUser();
  try {
    await signInWithEmail(context, testUser.email);
    await page.goto(getUrl("/sc/fellows"));
    await expect(page).toHaveURL(getUrl("/sc/fellows"));
    // Sets the session data cookie as well, if a cookie cache were enabled.
    expect((await page.request.get(getUrl("/api/auth/get-session"))).ok()).toBe(true);

    await db.delete(session).where(eq(session.userId, testUser.id));
    await page.goto(getUrl("/sc/fellows"));
    await expect(page).toHaveURL(loginUrl);
  } finally {
    await deleteUser(testUser.id);
  }
});

test("signing out from the user menu deletes the session", async ({ context, page }) => {
  const testUser = await createSupervisorUser();
  try {
    await signInWithEmail(context, testUser.email);
    await page.goto(getUrl("/sc/fellows"));
    await page.getByAltText("Profile arrow drop down icon").click();
    await page.getByRole("menuitem", { name: "Sign out" }).click();
    await expect(page).toHaveURL(loginUrl);
    expect(await db.$count(session, eq(session.userId, testUser.id))).toBe(0);

    await page.goto(getUrl("/sc/fellows"));
    await expect(page).toHaveURL(loginUrl);
  } finally {
    await deleteUser(testUser.id);
  }
});

test("archiving a signed-in user signs them out and blocks new sessions", async ({
  context,
  page,
}) => {
  const testUser = await createSupervisorUser();
  try {
    await signInWithEmail(context, testUser.email);
    await page.goto(getUrl("/sc/fellows"));
    await expect(page).toHaveURL(getUrl("/sc/fellows"));

    await db.update(user).set({ archivedAt: new Date() }).where(eq(user.id, testUser.id));
    await page.goto(getUrl("/sc/fellows"));
    await expect(page).toHaveURL(loginUrl);
    expect(await db.$count(session, eq(session.userId, testUser.id))).toBe(0);

    await expect(sessionCookieFor(testUser.email)).rejects.toThrow("This account is archived");
  } finally {
    await deleteUser(testUser.id);
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
