import { expect, test } from "#/tests/fixtures";
import { eq } from "drizzle-orm";

import { db } from "#/db/client";
import { session, user } from "#/db/schema";
import { createAdminCopy, sessionCookieFor, signInWithEmail } from "#/tests/helpers";
import { getUrl } from "#/tests/pages/helpers";
import { type Role, pickUser } from "#/tests/platform-routes";

const loginUrl = new RegExp(`^${getUrl("/login")}`);

test("a request without a session cookie goes to the login page with the path", async ({
  request,
}) => {
  const res = await request.get(getUrl("/hc/schools"), { maxRedirects: 0 });
  expect(res.status()).toBe(307);
  expect(res.headers().location).toBe("/login?next=%2Fhc%2Fschools");
});

const pagesThatLoadTheProfile: Array<[Role, string]> = [
  ["SUPERVISOR", "/sc/fellows"],
  ["FELLOW", "/fel/portal"],
  ["HUB_COORDINATOR", "/hc/schools"],
  ["OPERATIONS", "/ops/reporting/expenses/payout-history"],
];

for (const [role, route] of pagesThatLoadTheProfile) {
  test(`deleting the session row sends ${route} to the login page`, async ({ context, page }) => {
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

test("signing out from the user menu deletes the session", async ({ context, page, undo }) => {
  const admin = await createAdminCopy((await pickUser("ADMIN")).id);
  undo(admin.remove);
  await signInWithEmail(context, admin.email);
  await page.goto(getUrl("/admin/schedule"));
  await page.getByAltText("Profile arrow drop down icon").click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page).toHaveURL(loginUrl);
  // The browser drops its cookie either way; only the database shows the session was revoked.
  expect(await db.$count(session, eq(session.userId, admin.id))).toBe(0);

  await page.goto(getUrl("/admin/schedule"));
  await expect(page).toHaveURL(loginUrl);
});

test("archiving a signed-in user signs them out and blocks new sessions", async ({
  context,
  page,
  undo,
}) => {
  const admin = await createAdminCopy((await pickUser("ADMIN")).id);
  undo(admin.remove);
  await signInWithEmail(context, admin.email);
  await page.goto(getUrl("/admin/schedule"));
  await expect(page).toHaveURL(getUrl("/admin/schedule"));

  await db.update(user).set({ archivedAt: new Date() }).where(eq(user.id, admin.id));
  await page.goto(getUrl("/admin/schedule"));
  await expect(page).toHaveURL(loginUrl);
  expect(await db.$count(session, eq(session.userId, admin.id))).toBe(0);

  await expect(sessionCookieFor(admin.email)).rejects.toThrow("This account is archived");
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
